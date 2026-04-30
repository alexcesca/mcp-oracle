import oracledb from "oracledb";
import { withConnection } from "../db/pool.js";
import { metadataSchema } from "./metadata.js";
export const listPackagesDefinition = {
    name: "list_packages",
    description: "Lista todos os pacotes, suas procedures e seu contexto de sistema (módulo).",
    inputSchema: {
        type: "object",
        properties: {
            pattern: {
                type: "string",
                description: "Padrão SQL LIKE opcional para filtrar nomes de pacotes (ex: 'PK_AED%').",
            },
            metadata: metadataSchema,
        },
        required: ["metadata"],
    },
};
export async function listPackagesHandler(args) {
    return withConnection(async (connection) => {
        const binds = {};
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
