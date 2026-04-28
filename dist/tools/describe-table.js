import oracledb from "oracledb";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { withConnection } from "../db/pool.js";
export const describeTableDefinition = {
    name: "describe_table",
    description: "Get schema information for a specific table.",
    inputSchema: {
        type: "object",
        properties: {
            tableName: {
                type: "string",
                description: "The name of the table to describe (case-insensitive usually, but passed as-is).",
            },
        },
        required: ["tableName"],
    },
};
export async function describeTableHandler(args) {
    if (!args?.tableName) {
        throw new McpError(ErrorCode.InvalidParams, "tableName is required");
    }
    return withConnection(async (connection) => {
        const sql = `
      SELECT column_name, data_type, data_length, nullable
      FROM user_tab_columns
      WHERE table_name = UPPER(:tableName)
      ORDER BY column_id
    `;
        const result = await connection.execute(sql, { tableName: args.tableName }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (!result.rows || result.rows.length === 0) {
            return {
                content: [{
                        type: "text",
                        text: `Table '${args.tableName}' not found or no columns accessible.`,
                    }],
            };
        }
        return {
            content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
        };
    });
}
