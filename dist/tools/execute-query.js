import oracledb from "oracledb";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { withConnection } from "../db/pool.js";
import { metadataSchema } from "./metadata.js";
export const executeQueryDefinition = {
    name: "execute_query",
    description: "Executa uma consulta SELECT somente leitura no banco de dados Oracle.",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "A consulta SQL SELECT a ser executada.",
            },
            maxRows: {
                type: "number",
                description: "O número máximo de linhas a retornar (padrão: 100).",
            },
            metadata: metadataSchema,
        },
        required: ["query", "metadata"],
    },
};
export async function executeQueryHandler(args) {
    if (!args?.query) {
        throw new McpError(ErrorCode.InvalidParams, "query is required");
    }
    const query = args.query.trim();
    if (!/^\s*SELECT/i.test(query) && !/^\s*WITH\s/i.test(query)) {
        throw new McpError(ErrorCode.InvalidParams, "Only SELECT queries are allowed for security reasons.");
    }
    return withConnection(async (connection) => {
        const maxRows = args.maxRows || 100;
        const result = await connection.execute(query, {}, {
            maxRows,
            outFormat: oracledb.OUT_FORMAT_OBJECT,
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
        };
    });
}
