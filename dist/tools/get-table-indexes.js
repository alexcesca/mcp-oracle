import oracledb from "oracledb";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { withConnection } from "../db/pool.js";
export const getTableIndexesDefinition = {
    name: "get_table_indexes",
    description: "Get all indexes for a specific table, including index name, type, uniqueness, columns, and status. " +
        "Useful for performance analysis, checking missing indexes, and validating index coverage.",
    inputSchema: {
        type: "object",
        properties: {
            tableName: {
                type: "string",
                description: "The name of the table to retrieve indexes for (case-insensitive).",
            },
            includeStats: {
                type: "boolean",
                description: "If true, includes additional statistics like distinct keys, leaf blocks, and last analyzed date. Default: false.",
            },
        },
        required: ["tableName"],
    },
};
export async function getTableIndexesHandler(args) {
    if (!args?.tableName) {
        throw new McpError(ErrorCode.InvalidParams, "tableName is required");
    }
    return withConnection(async (connection) => {
        // 1. Get index metadata
        const indexSql = args.includeStats
            ? `
        SELECT
          i.index_name,
          i.index_type,
          i.uniqueness,
          i.status,
          i.tablespace_name,
          i.num_rows,
          i.distinct_keys,
          i.leaf_blocks,
          i.clustering_factor,
          TO_CHAR(i.last_analyzed, 'YYYY-MM-DD HH24:MI:SS') AS last_analyzed
        FROM user_indexes i
        WHERE i.table_name = UPPER(:tableName)
        ORDER BY i.index_name
      `
            : `
        SELECT
          i.index_name,
          i.index_type,
          i.uniqueness,
          i.status,
          i.tablespace_name
        FROM user_indexes i
        WHERE i.table_name = UPPER(:tableName)
        ORDER BY i.index_name
      `;
        const indexResult = await connection.execute(indexSql, { tableName: args.tableName }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (!indexResult.rows || indexResult.rows.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No indexes found for table '${args.tableName}'. The table may not exist or has no indexes defined.`,
                    },
                ],
            };
        }
        // 2. Get column details for each index
        const columnSql = `
      SELECT
        ic.index_name,
        ic.column_name,
        ic.column_position,
        ic.descend
      FROM user_ind_columns ic
      WHERE ic.table_name = UPPER(:tableName)
      ORDER BY ic.index_name, ic.column_position
    `;
        const columnResult = await connection.execute(columnSql, { tableName: args.tableName }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        // 3. Check for function-based index expressions
        const exprSql = `
      SELECT
        ie.index_name,
        ie.column_expression,
        ie.column_position
      FROM user_ind_expressions ie
      WHERE ie.table_name = UPPER(:tableName)
      ORDER BY ie.index_name, ie.column_position
    `;
        let exprRows = [];
        try {
            const exprResult = await connection.execute(exprSql, { tableName: args.tableName }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
            exprRows = exprResult.rows || [];
        }
        catch {
            // user_ind_expressions may not be accessible; silently ignore
        }
        // 4. Check which indexes correspond to primary/unique constraints
        const constraintSql = `
      SELECT
        c.constraint_name,
        c.constraint_type,
        c.index_name
      FROM user_constraints c
      WHERE c.table_name = UPPER(:tableName)
        AND c.constraint_type IN ('P', 'U')
        AND c.index_name IS NOT NULL
      ORDER BY c.constraint_name
    `;
        const constraintResult = await connection.execute(constraintSql, { tableName: args.tableName }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        // Build a map: indexName → constraint info
        const constraintMap = {};
        if (constraintResult.rows) {
            for (const row of constraintResult.rows) {
                constraintMap[row.INDEX_NAME] = {
                    name: row.CONSTRAINT_NAME,
                    type: row.CONSTRAINT_TYPE === "P" ? "PRIMARY KEY" : "UNIQUE",
                };
            }
        }
        // Build a map: indexName → columns[]
        const columnMap = {};
        if (columnResult.rows) {
            for (const row of columnResult.rows) {
                if (!columnMap[row.INDEX_NAME])
                    columnMap[row.INDEX_NAME] = [];
                columnMap[row.INDEX_NAME].push({
                    column: row.COLUMN_NAME,
                    position: row.COLUMN_POSITION,
                    descend: row.DESCEND,
                });
            }
        }
        // Build a map: indexName → expressions[]
        const exprMap = {};
        for (const row of exprRows) {
            if (!exprMap[row.INDEX_NAME])
                exprMap[row.INDEX_NAME] = [];
            exprMap[row.INDEX_NAME].push({
                expression: row.COLUMN_EXPRESSION,
                position: row.COLUMN_POSITION,
            });
        }
        // 5. Assemble final result
        const indexes = indexResult.rows.map((idx) => {
            const entry = {
                indexName: idx.INDEX_NAME,
                indexType: idx.INDEX_TYPE,
                uniqueness: idx.UNIQUENESS,
                status: idx.STATUS,
                tablespace: idx.TABLESPACE_NAME,
                columns: columnMap[idx.INDEX_NAME] || [],
            };
            if (exprMap[idx.INDEX_NAME]) {
                entry.expressions = exprMap[idx.INDEX_NAME];
            }
            if (constraintMap[idx.INDEX_NAME]) {
                entry.constraint = constraintMap[idx.INDEX_NAME];
            }
            if (args.includeStats) {
                entry.stats = {
                    numRows: idx.NUM_ROWS,
                    distinctKeys: idx.DISTINCT_KEYS,
                    leafBlocks: idx.LEAF_BLOCKS,
                    clusteringFactor: idx.CLUSTERING_FACTOR,
                    lastAnalyzed: idx.LAST_ANALYZED,
                };
            }
            return entry;
        });
        const summary = {
            table: args.tableName.toUpperCase(),
            totalIndexes: indexes.length,
            uniqueIndexes: indexes.filter((i) => i.uniqueness === "UNIQUE").length,
            nonUniqueIndexes: indexes.filter((i) => i.uniqueness === "NONUNIQUE").length,
            primaryKey: indexes.find((i) => i.constraint?.type === "PRIMARY KEY")?.indexName || null,
            indexes,
        };
        return {
            content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
        };
    });
}
