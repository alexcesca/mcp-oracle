import oracledb from "oracledb";
import { withConnection } from "../db/pool.js";
export const validatePackageStandardsDefinition = {
    name: "validate_package_standards",
    description: "Validate if an Oracle package follows the SIGA development standards (naming, prefixes, headers).",
    inputSchema: {
        type: "object",
        properties: {
            packageName: {
                type: "string",
                description: "The name of the package to validate.",
            },
        },
        required: ["packageName"],
    },
};
export async function validatePackageStandardsHandler(args) {
    const packageName = args.packageName.toUpperCase();
    return withConnection(async (connection) => {
        const sql = `
      SELECT type, line, text 
      FROM user_source 
      WHERE name = :packageName 
      ORDER BY type, line
    `;
        const result = await connection.execute(sql, { packageName }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const rows = result.rows;
        if (!rows || rows.length === 0) {
            return {
                content: [{ type: "text", text: `Package '${packageName}' not found.` }],
            };
        }
        const report = [`Validation Report for ${packageName}:`];
        const source = rows.map((r) => r.TEXT).join("");
        // 1. Naming conventions: Procedures must start with PKB_ (or PKL_ for private), Functions with FKG_ (or FKL_)
        const subprogramMatches = source.match(/(procedure|function)\s+([a-zA-Z0-9_]+)/gi) || [];
        subprogramMatches.forEach((match) => {
            const parts = match.split(/\s+/);
            const keyword = parts[0].toLowerCase();
            const name = parts[1].toUpperCase();
            if (keyword === "procedure" && !name.startsWith("PKB_") && !name.startsWith("PKL_")) {
                report.push(`[FAIL] Procedure '${name}' should start with 'PKB_' (public) or 'PKL_' (private).`);
            }
            if (keyword === "function" && !name.startsWith("FKG_") && !name.startsWith("FKL_")) {
                report.push(`[FAIL] Function '${name}' should start with 'FKG_' (public) or 'FKL_' (private).`);
            }
        });
        // 2. DDL keyword capitalization: PACKAGE, PROCEDURE, BEGIN, etc. must be UPPERCASE
        if (/\b(package|procedure|function|begin|exception|is|as|return|pragma)\b/.test(source)) {
            report.push("[WARN] Some DDL keywords are in lowercase. SIGA standards require UPPERCASE for DDL (PROCEDURE, BEGIN, etc.).");
        }
        // 3. Header comments: at least one /* ... */ block must exist
        if (!/\/\*[\s\S]*?\*\//.test(source)) {
            report.push("[FAIL] Missing mandatory header comment block (/* ... */).");
        }
        // 4. No TAB characters allowed (3-space indentation required)
        if (source.includes("\t")) {
            report.push("[FAIL] TAB characters found. Use spaces only (3-space indentation).");
        }
        // 5. Parameter prefix validation: out/in out parameters must use nocopy
        const outParamWithoutNocopy = source.match(/\b(out|in\s+out)\s+(?!nocopy)[a-zA-Z]/gi) || [];
        if (outParamWithoutNocopy.length > 0) {
            report.push(`[WARN] Found ${outParamWithoutNocopy.length} 'out'/'in out' parameter(s) possibly missing 'nocopy' directive.`);
        }
        if (report.length === 1) {
            report.push("[SUCCESS] Package follows SIGA development standards.");
        }
        return {
            content: [{ type: "text", text: report.join("\n") }],
        };
    });
}
