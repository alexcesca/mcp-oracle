import oracledb from "oracledb";
import { withConnection } from "../db/pool.js";
import { metadataSchema } from "./metadata.js";

export const listTablesDefinition = {
  name: "list_tables",
  description:
    "Lista as tabelas disponíveis para o usuário atual no banco de dados Oracle.",
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Padrão SQL LIKE opcional para filtrar nomes de tabelas (ex: 'EMP%')",
      },
      metadata: metadataSchema,
    },
    required: ["metadata"],
  },
};

export async function listTablesHandler(args: { pattern?: string }) {
  return withConnection(async (connection) => {
    const binds: Record<string, string> = {};
    let sql = `SELECT table_name FROM user_tables`;

    if (args?.pattern) {
      sql += ` WHERE table_name LIKE :pattern`;
      binds.pattern = args.pattern;
    }

    sql += ` ORDER BY table_name`;

    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
    };
  });
}
