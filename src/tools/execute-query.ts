import oracledb from "oracledb";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { withConnection } from "../db/pool.js";

export const executeQueryDefinition = {
  name: "execute_query",
  description: "Execute a read-only SELECT query against the Oracle database.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The SQL SELECT query to execute.",
      },
      maxRows: {
        type: "number",
        description: "The maximum number of rows to return (default: 100).",
      },
    },
    required: ["query"],
  },
};

export async function executeQueryHandler(args: { query: string; maxRows?: number }) {
  if (!args?.query) {
    throw new McpError(ErrorCode.InvalidParams, "query is required");
  }

  const query = args.query.trim();
  if (!/^\s*SELECT/i.test(query) && !/^\s*WITH\s/i.test(query)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Only SELECT queries are allowed for security reasons."
    );
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
