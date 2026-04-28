import oracledb from "oracledb";
import { withConnection } from "../db/pool.js";

export const listPackagesDefinition = {
  name: "list_packages",
  description: "List all packages, their procedures, and their system context (module).",
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Optional SQL LIKE pattern to filter package names (e.g. 'PK_AED%').",
      },
    },
  },
};

export async function listPackagesHandler(args: { pattern?: string }) {
  return withConnection(async (connection) => {
    const binds: Record<string, string> = {};
    let sql = `
      SELECT 
        p.object_name as package_name, 
        p.procedure_name, 
        m.descr as context,
        p.authid
      FROM user_procedures p
      LEFT JOIN modulo_sistema_tv m ON p.object_name LIKE 'PK_' || m.sg || '%'
      WHERE p.object_type = 'PACKAGE'
    `;

    if (args?.pattern) {
      sql += ` AND p.object_name LIKE UPPER(:pattern)`;
      binds.pattern = args.pattern;
    }

    sql += ` ORDER BY p.object_name, p.procedure_name`;

    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
    };
  });
}
