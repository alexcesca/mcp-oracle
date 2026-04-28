import oracledb from "oracledb";
import { withConnection } from "../db/pool.js";
export const listTablesDefinition = {
    name: "list_tables",
    description: "List tables available to the current user in the Oracle database.",
    inputSchema: {
        type: "object",
        properties: {
            pattern: {
                type: "string",
                description: "Optional SQL LIKE pattern to filter table names (e.g. 'EMP%')",
            },
        },
    },
};
export async function listTablesHandler(args) {
    return withConnection(async (connection) => {
        const binds = {};
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
