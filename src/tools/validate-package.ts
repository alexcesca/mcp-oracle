import oracledb from "oracledb";
import { withConnection } from "../db/pool.js";
import { metadataSchema } from "./metadata.js";

export const validatePackageStandardsDefinition = {
  name: "validate_package_standards",
  description:
    "Valida se um pacote Oracle segue os padrões de desenvolvimento SIGA definidos em Padrao_pl_sql.md. " +
    "Verifica: indentação (3 espaços, sem tabs), comentários de cabeçalho de procedure/função, convenções de nomenclatura " +
    "(PKB_/PKL_ para procedures, FKG_/FKL_ para funções), prefixos de variáveis (locais vn_/vv_/vd_/vb_/vt_/vr_/vc_, " +
    "privadas gn_/gv_/gd_/gb_/gt_/gr_, parâmetros de entrada en_/ev_/ed_/eb_/et_/er_/ec_, parâmetros de saída sn_/sv_/sd_/sb_/st_/sr_/sc_ " +
    "com NOCOPY, parâmetros de entrada-saída esn_/esv_/esd_/esb_/est_/esr_/esc_ com NOCOPY), prefixo de exceção (ve_), " +
    "prefixos de tipos record (t_rec_/t_tab_rec_), prefixo de cursor (cur_), nomenclatura do arquivo de pacote (pk_[modulo]_[nome_curto]), " +
    "procedures padrão obrigatórias para pacotes de tabela (FKG_SEQ, PKB_VAL, PKB_CON, PKB_INC, PKB_ALT, PKB_EXC), " +
    "sem SELECT *, sem DBMS_OUTPUT em produção, sem blocos de código comentados, sem %ROWTYPE em pacotes de programa/tela, " +
    "constantes em MAIÚSCULO, palavras-chave DDL em MAIÚSCULO, padrões de tratamento de exceção (ve_erro, OTHERS iniciando em 90000, " +
    "chamadas pk_soft.pkb_busca_msg_erro), restrição de DML em funções e orientação sobre bulk collect vs cursor.",
  inputSchema: {
    type: "object",
    properties: {
      packageName: {
        type: "string",
        description: "O nome do pacote a ser validado.",
      },
      metadata: metadataSchema,
    },
    required: ["packageName", "metadata"],
  },
};

// ───────────────────────────────────── helpers ──────────────────────────────────

interface SourceLine {
  TYPE: string;
  LINE: number;
  TEXT: string;
}

function lineRef(line: number): string {
  return `(line ${line})`;
}

/** Split source rows into spec and body  */
function splitSpecBody(rows: SourceLine[]) {
  const spec: SourceLine[] = [];
  const body: SourceLine[] = [];
  for (const r of rows) {
    if (r.TYPE === "PACKAGE") spec.push(r);
    else if (r.TYPE === "PACKAGE BODY") body.push(r);
  }
  return { spec, body };
}

function joinText(rows: SourceLine[]): string {
  return rows.map((r) => r.TEXT).join("");
}

// ───────────────────────────────────── main handler ─────────────────────────────

export async function validatePackageStandardsHandler(args: { packageName: string }) {
  const packageName = args.packageName.toUpperCase();

  return withConnection(async (connection) => {
    const sql = `
      SELECT type, line, text
      FROM user_source
      WHERE name = :packageName
      ORDER BY type, line
    `;

    const result = await connection.execute(sql, { packageName }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const rows = result.rows as SourceLine[];

    if (!rows || rows.length === 0) {
      return {
        content: [{ type: "text", text: `Package '${packageName}' not found in USER_SOURCE.` }],
      };
    }

    const { spec, body } = splitSpecBody(rows);
    const specText = joinText(spec);
    const bodyText = joinText(body);
    const fullSource = specText + bodyText;

    const fails: string[] = [];
    const warns: string[] = [];
    const infos: string[] = [];

    // ════════════════════════════════════════════════════════════════════════════
    // 1. INDENTATION — 3 spaces, no TABs
    // ════════════════════════════════════════════════════════════════════════════
    const allRows = [...spec, ...body];
    const tabLines: number[] = [];
    for (const r of allRows) {
      if (r.TEXT.includes("\t")) tabLines.push(r.LINE);
    }
    if (tabLines.length > 0) {
      fails.push(
        `[FAIL] TAB characters found on ${tabLines.length} line(s). ` +
          `SIGA standard requires 3-space indentation, never TABs. ` +
          `First occurrences: ${tabLines.slice(0, 5).map((l) => lineRef(l)).join(", ")}`
      );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 2. HEADER COMMENTS — each procedure/function in the body must have a
    //    comment block (/* ... */) immediately before it containing:
    //    - "Desenvolvido por:"
    //    - "Data:"
    //    - "Definição:"
    //    - "Parâmetros:"
    //    (Functions also need "Retorno:")
    // ════════════════════════════════════════════════════════════════════════════
    if (body.length > 0) {
      const bodyLines = body.map((r) => r.TEXT);

      // find subprogram declarations in body
      const subprogramLineRegex = /^\s*(procedure|function)\s+([a-zA-Z0-9_]+)/i;
      const headerRequiredFields = ["Desenvolvido por", "Data", "Definição", "Parâmetros"];

      for (let i = 0; i < bodyLines.length; i++) {
        const m = bodyLines[i].match(subprogramLineRegex);
        if (!m) continue;
        const kind = m[1].toLowerCase();
        const name = m[2];

        // Look backwards from this line for a /* ... */ comment block
        let commentBlock = "";
        let foundComment = false;
        for (let j = i - 1; j >= 0 && j >= i - 40; j--) {
          commentBlock = bodyLines[j] + commentBlock;
          if (bodyLines[j].includes("/*")) {
            foundComment = true;
            break;
          }
          // Stop if we hit another procedure/function/begin/end
          if (/^\s*(procedure|function|begin|end)\b/i.test(bodyLines[j])) break;
        }

        if (!foundComment) {
          fails.push(
            `[FAIL] ${kind === "procedure" ? "Procedure" : "Function"} '${name}' ` +
              `${lineRef(body[i].LINE)} is missing the mandatory header comment block /* ... */.`
          );
        } else {
          // Check required fields
          for (const field of headerRequiredFields) {
            if (!commentBlock.toLowerCase().includes(field.toLowerCase())) {
              warns.push(
                `[WARN] Header comment for '${name}' ${lineRef(body[i].LINE)} ` +
                  `is missing required field '${field}:'.`
              );
            }
          }
          // Functions must also have "Retorno:"
          if (kind === "function" && !commentBlock.toLowerCase().includes("retorno")) {
            warns.push(
              `[WARN] Function '${name}' ${lineRef(body[i].LINE)} header is missing 'Retorno:' field.`
            );
          }
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 3. PROCEDURE / FUNCTION NAMING — PKB_ / PKL_ / FKG_ / FKL_
    // ════════════════════════════════════════════════════════════════════════════
    const subprogramMatches = fullSource.match(/(procedure|function)\s+([a-zA-Z0-9_]+)/gi) || [];
    const procNames: string[] = [];
    const funcNames: string[] = [];

    subprogramMatches.forEach((match) => {
      const parts = match.split(/\s+/);
      const keyword = parts[0].toLowerCase();
      const name = parts[1].toUpperCase();

      if (keyword === "procedure") {
        procNames.push(name);
        if (!name.startsWith("PKB_") && !name.startsWith("PKL_")) {
          fails.push(
            `[FAIL] Procedure '${name}' does not follow naming convention. ` +
              `Must start with 'PKB_' (public) or 'PKL_' (nested/private).`
          );
        }
      }
      if (keyword === "function") {
        funcNames.push(name);
        if (!name.startsWith("FKG_") && !name.startsWith("FKL_")) {
          fails.push(
            `[FAIL] Function '${name}' does not follow naming convention. ` +
              `Must start with 'FKG_' (public) or 'FKL_' (nested/private).`
          );
        }
      }
    });

    // ════════════════════════════════════════════════════════════════════════════
    // 4. PROCEDURE OPERATION NAMING — PKB_CON_, PKB_INC_, PKB_ALT_, PKB_EXC_, PKB_LOC_
    // ════════════════════════════════════════════════════════════════════════════
    const validOperations = ["CON", "INC", "ALT", "EXC", "LOC", "VAL", "VALIDA", "POSTQUER", "LOV", "SEQ"];
    for (const name of procNames) {
      if (!name.startsWith("PKB_") && !name.startsWith("PKL_")) continue;
      const afterPrefix = name.replace(/^PK[BL]_/, "");
      const opPart = afterPrefix.split("_")[0];
      if (opPart && !validOperations.includes(opPart)) {
        infos.push(
          `[INFO] Procedure '${name}' uses non-standard operation identifier '${opPart}'. ` +
            `Standard operations: CON, INC, ALT, EXC, LOC, VAL, VALIDA, POSTQUER, LOV.`
        );
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 5. NAME LENGTH — package + procedure/function name ≤ 30 characters
    // ════════════════════════════════════════════════════════════════════════════
    const allNames = [...procNames, ...funcNames];
    for (const name of allNames) {
      const fullName = `${packageName}.${name}`;
      if (fullName.length > 30) {
        warns.push(
          `[WARN] '${fullName}' has ${fullName.length} characters (max 30). ` +
            `This may cause Oracle identifier issues.`
        );
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 6. VARIABLE PREFIX VALIDATION
    //    Local vars: vn_, vv_, vd_, vb_, vt_, vr_, vc_
    //    Private/global: gn_, gv_, gd_, gb_, gt_, gr_
    //    Input params: en_, ev_, ed_, eb_, et_, er_, ec_
    //    Output params: sn_, sv_, sd_, sb_, st_, sr_, sc_
    //    In-Out params: esn_, esv_, esd_, esb_, est_, esr_, esc_
    //    Exceptions: ve_
    //    Cursors: cur_
    //    Index vars: vn_indice (pls_integer)
    // ════════════════════════════════════════════════════════════════════════════
    const validLocalPrefixes = ["vn_", "vv_", "vd_", "vb_", "vt_", "vr_", "vc_"];
    const validGlobalPrefixes = ["gn_", "gv_", "gd_", "gb_", "gt_", "gr_"];
    const validInputPrefixes = ["en_", "ev_", "ed_", "eb_", "et_", "er_", "ec_"];
    const validOutputPrefixes = ["sn_", "sv_", "sd_", "sb_", "st_", "sr_", "sc_"];
    const validInOutPrefixes = ["esn_", "esv_", "esd_", "esb_", "est_", "esr_", "esc_"];

    // Check parameter prefixes in parameter declarations
    const paramRegex =
      /(\w+)\s+(?:in\s+out\s+nocopy|in\s+out|out\s+nocopy|out|in)\s+/gi;
    let paramMatch;
    while ((paramMatch = paramRegex.exec(fullSource)) !== null) {
      const paramName = paramMatch[1].toLowerCase();
      // skip keywords that might match
      if (["procedure", "function", "is", "as", "return", "begin", "end"].includes(paramName)) continue;

      const isInOut = /in\s+out/i.test(paramMatch[0]);
      const isOut = !isInOut && /\bout\b/i.test(paramMatch[0]);
      const isIn = !isInOut && !isOut;

      if (isInOut) {
        if (!validInOutPrefixes.some((p) => paramName.startsWith(p))) {
          warns.push(
            `[WARN] IN OUT parameter '${paramName}' should use prefix esn_/esv_/esd_/esb_/est_/esr_/esc_.`
          );
        }
      } else if (isOut) {
        if (!validOutputPrefixes.some((p) => paramName.startsWith(p))) {
          warns.push(
            `[WARN] OUT parameter '${paramName}' should use prefix sn_/sv_/sd_/sb_/st_/sr_/sc_.`
          );
        }
      } else if (isIn) {
        if (!validInputPrefixes.some((p) => paramName.startsWith(p))) {
          warns.push(
            `[WARN] IN parameter '${paramName}' should use prefix en_/ev_/ed_/eb_/et_/er_/ec_.`
          );
        }
      }
    }

    // Check exception variable prefix (ve_)
    const exceptionDeclRegex = /(\w+)\s+exception\b/gi;
    let excMatch;
    while ((excMatch = exceptionDeclRegex.exec(fullSource)) !== null) {
      const excName = excMatch[1].toLowerCase();
      if (!excName.startsWith("ve_")) {
        fails.push(
          `[FAIL] Exception variable '${excName}' must start with 've_' prefix.`
        );
      }
    }

    // Check cursor prefix (cur_)
    const cursorDeclRegex = /(\w+)\s+sys_refcursor\b/gi;
    let curMatch;
    while ((curMatch = cursorDeclRegex.exec(fullSource)) !== null) {
      const curName = curMatch[1].toLowerCase();
      if (!curName.startsWith("cur_")) {
        warns.push(
          `[WARN] Cursor variable '${curName}' should start with 'cur_' prefix.`
        );
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 7. TYPE NAMING — t_rec_ for Records, t_tab_rec_ for Associative Arrays/Collections
    // ════════════════════════════════════════════════════════════════════════════
    const typeRecordRegex = /type\s+(\w+)\s+is\s+record\b/gi;
    let typeMatch;
    while ((typeMatch = typeRecordRegex.exec(fullSource)) !== null) {
      const typeName = typeMatch[1].toLowerCase();
      if (!typeName.startsWith("t_rec_")) {
        fails.push(
          `[FAIL] Record type '${typeName}' must use prefix 't_rec_'.`
        );
      }
    }

    const typeTableRegex = /type\s+(\w+)\s+is\s+table\s+of\b/gi;
    while ((typeMatch = typeTableRegex.exec(fullSource)) !== null) {
      const typeName = typeMatch[1].toLowerCase();
      if (!typeName.startsWith("t_tab_rec_")) {
        warns.push(
          `[WARN] Table/collection type '${typeName}' should use prefix 't_tab_rec_'.`
        );
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 8. OUT / IN OUT PARAMETERS — must use NOCOPY
    // ════════════════════════════════════════════════════════════════════════════
    const outWithoutNocopyRegex = /\b(out)\s+(?!nocopy\b)(\w)/gi;
    const inOutWithoutNocopyRegex = /\bin\s+out\s+(?!nocopy\b)(\w)/gi;

    const outNoCopyMatches = fullSource.match(outWithoutNocopyRegex) || [];
    const inOutNoCopyMatches = fullSource.match(inOutWithoutNocopyRegex) || [];

    // Filter out false positives (the word "out" in "in out nocopy")
    const totalMissing = outNoCopyMatches.length + inOutNoCopyMatches.length;
    if (totalMissing > 0) {
      warns.push(
        `[WARN] Found ${totalMissing} OUT/IN OUT parameter(s) possibly missing 'NOCOPY' directive. ` +
          `Output parameters should use NOCOPY for pass-by-reference.`
      );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 9. CONSTANTS — must be declared in UPPERCASE
    // ════════════════════════════════════════════════════════════════════════════
    const constantRegex = /(\w+)\s+constant\b/gi;
    let constMatch;
    while ((constMatch = constantRegex.exec(fullSource)) !== null) {
      const constName = constMatch[1];
      if (constName !== constName.toUpperCase()) {
        fails.push(
          `[FAIL] Constant '${constName}' must be declared in UPPERCASE.`
        );
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 10. DDL KEYWORDS — PACKAGE, PROCEDURE, FUNCTION, BEGIN, END, EXCEPTION,
    //     IS, AS, RETURN, PRAGMA should be UPPERCASE
    // ════════════════════════════════════════════════════════════════════════════
    const ddlKeywords = [
      "package", "procedure", "function", "begin", "end",
      "exception", "is", "as", "return", "pragma",
    ];
    const lowercaseDdlFound: string[] = [];
    for (const kw of ddlKeywords) {
      // Match the keyword as a whole word in lowercase (not inside strings/comments)
      const regex = new RegExp(`\\b${kw}\\b`, "g");
      if (regex.test(fullSource)) {
        // Only report if not already in uppercase
        const upperRegex = new RegExp(`\\b${kw.toUpperCase()}\\b`, "g");
        const lowerCount = (fullSource.match(regex) || []).length;
        const upperCount = (fullSource.match(upperRegex) || []).length;
        if (lowerCount > upperCount) {
          lowercaseDdlFound.push(kw.toUpperCase());
        }
      }
    }
    if (lowercaseDdlFound.length > 0) {
      warns.push(
        `[WARN] DDL keywords found in lowercase: ${lowercaseDdlFound.join(", ")}. ` +
          `SIGA standards require UPPERCASE for DDL keywords.`
      );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 11. SELECT * — never allowed
    // ════════════════════════════════════════════════════════════════════════════
    const selectStarRegex = /\bselect\s+\*/gi;
    const selectStarMatches = fullSource.match(selectStarRegex) || [];
    if (selectStarMatches.length > 0) {
      fails.push(
        `[FAIL] Found ${selectStarMatches.length} occurrence(s) of 'SELECT *'. ` +
          `SIGA standard: always specify column names explicitly.`
      );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 12. DBMS_OUTPUT — prohibited in production code
    // ════════════════════════════════════════════════════════════════════════════
    const dbmsOutputRegex = /dbms_output\s*\./gi;
    const dbmsMatches = fullSource.match(dbmsOutputRegex) || [];
    if (dbmsMatches.length > 0) {
      fails.push(
        `[FAIL] Found ${dbmsMatches.length} occurrence(s) of DBMS_OUTPUT. ` +
          `SIGA standard: DBMS_OUTPUT is prohibited in production code.`
      );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 13. COMMENTED-OUT CODE — blocks of commented code are prohibited
    // ════════════════════════════════════════════════════════════════════════════
    // Detect lines that look like commented-out code (-- followed by PL/SQL keywords)
    const commentedCodeRegex =
      /--\s*(select|insert|update|delete|begin|end|if|else|for|while|loop|declare|procedure|function|exception)\b/gi;
    const commentedCodeMatches = fullSource.match(commentedCodeRegex) || [];
    if (commentedCodeMatches.length > 3) {
      warns.push(
        `[WARN] Found ${commentedCodeMatches.length} lines of potentially commented-out code. ` +
          `SIGA standard: commented-out code ('sujeira') is prohibited in production.`
      );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 14. %ROWTYPE — prohibited in program (screen) packages
    //     (allowed in table packages, but flagged as warning — manual declaration preferred)
    // ════════════════════════════════════════════════════════════════════════════
    const rowtypeRegex = /%rowtype\b/gi;
    const rowtypeMatches = fullSource.match(rowtypeRegex) || [];
    const isScreenPackage = /^PK_\w+F\d+$/i.test(packageName);
    if (rowtypeMatches.length > 0) {
      if (isScreenPackage) {
        fails.push(
          `[FAIL] Found ${rowtypeMatches.length} usage(s) of %ROWTYPE. ` +
            `%ROWTYPE is PROHIBITED in screen/program packages. Declare types field-by-field.`
        );
      } else {
        warns.push(
          `[WARN] Found ${rowtypeMatches.length} usage(s) of %ROWTYPE. ` +
            `In table packages, manual field-by-field declaration is preferred over %ROWTYPE.`
        );
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 15. FUNCTIONS MUST NOT CONTAIN DML (INSERT, UPDATE, DELETE)
    // ════════════════════════════════════════════════════════════════════════════
    if (body.length > 0) {
      const bodyFullText = bodyText;
      // Extract function bodies
      const funcBodyRegex = /\bfunction\s+(\w+)\b[\s\S]*?\breturn\b[\s\S]*?\bend\s+\1\b/gi;
      let funcBodyMatch;
      while ((funcBodyMatch = funcBodyRegex.exec(bodyFullText)) !== null) {
        const funcName = funcBodyMatch[1];
        const funcContent = funcBodyMatch[0];
        if (/\b(insert\s+into|update\s+\w+\s+set|delete\s+from)\b/i.test(funcContent)) {
          fails.push(
            `[FAIL] Function '${funcName}' contains DML statements (INSERT/UPDATE/DELETE). ` +
              `Functions must be side-effect free (queries/calculations only). Use a Procedure instead.`
          );
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 16. MANDATORY PROCEDURES/FUNCTIONS FOR TABLE PACKAGES
    //     Table packages (PK_[module]_[shortname]) must contain:
    //     FKG_SEQ, PKB_VAL, PKB_CON_[shortname], PKB_INC_[shortname],
    //     PKB_ALT_[shortname], PKB_EXC_[shortname]
    // ════════════════════════════════════════════════════════════════════════════
    const isTablePackage = /^PK_(\w{2,4})_(\w+)$/i.test(packageName) && !isScreenPackage;
    if (isTablePackage) {
      const mandatoryFunctions = ["FKG_SEQ"];
      const mandatoryProcedures = ["PKB_VAL"];
      // Extract shortname from package name (after module prefix)
      const pkgMatch = packageName.match(/^PK_(\w{2,4})_(\w+)$/i);
      const shortName = pkgMatch ? pkgMatch[2].toUpperCase() : "";

      const mandatoryCrudProcedures = [
        `PKB_CON_${shortName}`,
        `PKB_INC_${shortName}`,
        `PKB_ALT_${shortName}`,
        `PKB_EXC_${shortName}`,
      ];

      const allSubNames = [...procNames, ...funcNames].map((n) => n.toUpperCase());

      for (const fn of mandatoryFunctions) {
        if (!allSubNames.includes(fn)) {
          warns.push(
            `[WARN] Table package is missing mandatory function '${fn}'. ` +
              `Every table package should include FKG_SEQ.`
          );
        }
      }
      for (const proc of mandatoryProcedures) {
        if (!allSubNames.includes(proc)) {
          warns.push(
            `[WARN] Table package is missing mandatory procedure '${proc}'. ` +
              `Every table package should include PKB_VAL.`
          );
        }
      }
      for (const proc of mandatoryCrudProcedures) {
        if (!allSubNames.includes(proc)) {
          warns.push(
            `[WARN] Table package is missing standard CRUD procedure '${proc}'.`
          );
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 17. SCREEN PACKAGE NAMING — pk_[module]F[screen_code]
    //     Must contain appropriate procedures: PKB_VALIDA, PKB_POSTQUER
    // ════════════════════════════════════════════════════════════════════════════
    if (isScreenPackage) {
      const screenMandatory = ["PKB_VALIDA", "PKB_POSTQUER"];
      const allSubNames = [...procNames, ...funcNames].map((n) => n.toUpperCase());
      for (const proc of screenMandatory) {
        if (!allSubNames.includes(proc)) {
          infos.push(
            `[INFO] Screen package may be missing standard procedure '${proc}' ` +
              `(required when applicable).`
          );
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 18. EXCEPTION HANDLING PATTERNS
    //     - OTHERS handler must exist
    //     - OTHERS error codes should start at 90000
    //     - Must call pk_soft.pkb_busca_msg_erro in exception handlers
    // ════════════════════════════════════════════════════════════════════════════
    if (body.length > 0) {
      // Check for WHEN OTHERS
      if (!/when\s+others\s+then/i.test(bodyText)) {
        warns.push(
          `[WARN] No 'WHEN OTHERS THEN' exception handler found in package body. ` +
            `Each procedure should have an OTHERS exception handler.`
        );
      }

      // Check for pk_soft.pkb_busca_msg_erro usage
      if (/when\s+others\s+then/i.test(bodyText) && !/pk_soft\.pkb_busca_msg_erro/i.test(bodyText)) {
        warns.push(
          `[WARN] WHEN OTHERS handler(s) found but no call to 'pk_soft.pkb_busca_msg_erro'. ` +
            `Exception handlers should use pk_soft.pkb_busca_msg_erro for error message lookup.`
        );
      }

      // Check ve_erro exception variable exists
      if (!/\bve_erro\b/i.test(bodyText)) {
        infos.push(
          `[INFO] No 've_erro' exception variable found. ` +
            `Standard pattern requires ve_erro exception for controlled error flow.`
        );
      }

      // Check standard error output parameters (sv_sistema, sv_processo, sv_msg_erro, sn_cd_erro)
      const stdErrorParams = ["sv_sistema", "sv_processo", "sv_msg_erro", "sn_cd_erro"];
      for (const param of stdErrorParams) {
        if (!fullSource.toLowerCase().includes(param)) {
          infos.push(
            `[INFO] Standard error output parameter '${param}' not found. ` +
              `Procedures typically expose error details through sv_sistema, sv_processo, sv_msg_erro, sn_cd_erro.`
          );
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 19. PACKAGE SPECIFICATION ORDER
    //     Spec should follow: Constants → Types → Functions → Procedures
    // ════════════════════════════════════════════════════════════════════════════
    if (spec.length > 0) {
      let lastSection = 0; // 0=start, 1=constants, 2=types, 3=functions, 4=procedures
      for (const r of spec) {
        const txt = r.TEXT.toLowerCase().trim();
        if (/\bconstant\b/.test(txt)) {
          if (lastSection > 1) {
            warns.push(
              `[WARN] Package Specification order violation ${lineRef(r.LINE)}: ` +
                `Constant declaration found after Types/Functions/Procedures. ` +
                `Recommended order: Constants → Types → Functions → Procedures.`
            );
            break;
          }
          lastSection = Math.max(lastSection, 1);
        } else if (/\btype\s+\w+\s+is\b/.test(txt)) {
          if (lastSection > 2) {
            warns.push(
              `[WARN] Package Specification order violation ${lineRef(r.LINE)}: ` +
                `Type declaration found after Functions/Procedures. ` +
                `Recommended order: Constants → Types → Functions → Procedures.`
            );
            break;
          }
          lastSection = Math.max(lastSection, 2);
        } else if (/\bfunction\b/.test(txt)) {
          if (lastSection > 3) {
            warns.push(
              `[WARN] Package Specification order violation ${lineRef(r.LINE)}: ` +
                `Function declaration found after Procedures. ` +
                `Recommended order: Constants → Types → Functions → Procedures.`
            );
            break;
          }
          lastSection = Math.max(lastSection, 3);
        } else if (/\bprocedure\b/.test(txt)) {
          lastSection = Math.max(lastSection, 4);
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 20. PACKAGE BODY ORDER
    //     Body should follow: Exceptions → Private Constants → Private Types →
    //     Private Variables (globals) → Functions → Procedures
    // ════════════════════════════════════════════════════════════════════════════
    // (Light check — just verify functions come before procedures)
    if (body.length > 0) {
      let firstProcLine = Infinity;
      let lastFuncLine = 0;
      for (const r of body) {
        const txt = r.TEXT.toLowerCase().trim();
        if (/^\s*procedure\s+/i.test(r.TEXT) && r.LINE < firstProcLine) {
          firstProcLine = r.LINE;
        }
        if (/^\s*function\s+/i.test(r.TEXT)) {
          lastFuncLine = r.LINE;
        }
      }
      if (lastFuncLine > firstProcLine && firstProcLine < Infinity) {
        infos.push(
          `[INFO] Package Body order: a Function is declared after the first Procedure ` +
            `(func at line ${lastFuncLine}, proc at line ${firstProcLine}). ` +
            `Recommended order: Functions before Procedures.`
        );
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 21. PACKAGE NAMING CONVENTION
    //     Table package:  PK_[module]_[shortname]  (pk_efd_bemimobefd)
    //     Screen package: PK_[module]F[screencode]  (pk_efdf0107)
    // ════════════════════════════════════════════════════════════════════════════
    if (!/^PK_\w+$/i.test(packageName)) {
      warns.push(
        `[WARN] Package name '${packageName}' does not follow the naming convention PK_[module]_[shortname] ` +
          `(table package) or PK_[module]F[code] (screen package).`
      );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 22. BULK COLLECT / CURSOR GUIDANCE
    // ════════════════════════════════════════════════════════════════════════════
    if (/\bbulk\s+collect\b/i.test(bodyText) && !/\blimit\b/i.test(bodyText)) {
      infos.push(
        `[INFO] BULK COLLECT found without LIMIT clause. For large datasets (>50,000 rows), ` +
          `consider using a cursor or adding a LIMIT clause for better memory management.`
      );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 23. NVL with COUNT — unnecessary pattern
    // ════════════════════════════════════════════════════════════════════════════
    if (/nvl\s*\(\s*\w+\.count/i.test(fullSource)) {
      infos.push(
        `[INFO] nvl() used with .count — COUNT always returns a value and never NULL. ` +
          `The nvl() wrapping is unnecessary. Use '.count > 0' directly.`
      );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 24. PK_SFPADRAO USAGE OUTSIDE VALIDA/POSTQUER (screen packages only)
    // ════════════════════════════════════════════════════════════════════════════
    if (isScreenPackage && /pk_sfpadrao\./i.test(bodyText)) {
      // Check if pk_sfpadrao is used outside of PKB_VALIDA or PKB_POSTQUER
      // Simple heuristic: if pk_sfpadrao appears in the body, check that it's not in other procedures
      const sfpadraoProcContext = bodyText.match(
        /procedure\s+(pkb_(?!valida\b|postquer\b)\w+)[\s\S]*?pk_sfpadrao\./gi
      );
      if (sfpadraoProcContext && sfpadraoProcContext.length > 0) {
        fails.push(
          `[FAIL] pk_sfpadrao usage detected outside PKB_VALIDA/PKB_POSTQUER. ` +
            `PK_SFPADRAO is ONLY allowed in PKB_VALIDA and PKB_POSTQUER procedures.`
        );
      }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 25. TYPE OBJECTS — prohibited, only TYPE RECORD allowed
    // ════════════════════════════════════════════════════════════════════════════
    if (/\btype\s+\w+\s+is\s+object\b/i.test(fullSource)) {
      fails.push(
        `[FAIL] TYPE OBJECT found. SIGA standard only allows TYPE RECORD. ` +
          `TYPE OBJECT is not permitted.`
      );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BUILD FINAL REPORT
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Função helper para tentar extrair e estruturar a mensagem
    const parseFinding = (rawMsg: string, severity: "ERRO" | "ALERTA" | "SUGESTÃO") => {
      // Remove o prefixo do bracket ex: [FAIL], [WARN], [INFO]
      let msg = rawMsg.replace(/^\[(FAIL|WARN|INFO)\]\s*/i, "");
      
      // Procura "(line X)" ou "line X"
      let excerpt = "Desconhecido";
      const lineMatch = msg.match(/\(?line\s+(\d+)\)?/i);
      if (lineMatch) {
         excerpt = "Linha " + lineMatch[1];
         msg = msg.replace(lineMatch[0], "").trim();
      }

      // Procura por regras / contexto na primeira frase
      const phrases = msg.split(". ");
      const description = phrases[0] ? phrases[0].trim() + (phrases[0].endsWith(".") ? "" : ".") : msg;
      
      // O restante vira recomendação / detalhe analítico
      let recommendation = phrases.slice(1).join(". ").trim();
      if (!recommendation) recommendation = "Revise o código para atender os padrões SIGA.";

      return {
        severity,
        rule: "Padrao_SIGA", // Regra genérica mapeada
        description,
        code_excerpt: excerpt,
        recommendation
      };
    };

    const findingsArr: any[] = [];
    fails.forEach(f => findingsArr.push(parseFinding(f, "ERRO")));
    warns.forEach(w => findingsArr.push(parseFinding(w, "ALERTA")));
    infos.forEach(i => findingsArr.push(parseFinding(i, "SUGESTÃO")));

    let status = "APROVADO";
    if (fails.length > 0) status = "REPROVADO";
    else if (warns.length > 0) status = "APROVADO_COM_ALERTAS";

    const reportObj = {
      object_name: packageName,
      object_type: isScreenPackage ? "PACKAGE (SCREEN)" : (isTablePackage ? "PACKAGE (TABLE)" : "PACKAGE"),
      status,
      summary: {
        errors: fails.length,
        warnings: warns.length,
        suggestions: infos.length
      },
      findings: findingsArr
    };

    return {
      content: [{ type: "text", text: JSON.stringify(reportObj, null, 2) }],
    };
  });
}
