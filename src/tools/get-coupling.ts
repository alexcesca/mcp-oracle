import oracledb from "oracledb";
import { withConnection } from "../db/pool.js";

export const getCouplingDefinition = {
  name: "get_coupling",
  description: "Analyze module/package coupling based on the acoplamento_siga table. Can filter by calling package (package_origem), called package (package_chamada), originating module (modulo_origem) and called module (modulo_chamado).",
  inputSchema: {
    type: "object",
    properties: {
      packageOrigem: {
        type: "string",
        description: "Filter by the package making the call (PACKAGE_ORIGEM) (e.g. 'PK_AED_SOMETHING')",
      },
      packageChamada: {
        type: "string",
        description: "Filter by the package being called (PACKAGE_CHAMADA) (e.g. 'PK_EFD_SOMETHING')",
      },
      moduloOrigem: {
        type: "string",
        description: "Filter by the module of the calling package (MODULO_ORIGEM)",
      },
      moduloChamado: {
        type: "string",
        description: "Filter by the module of the called package (MODULO_CHAMADO)",
      },
      maxRows: {
        type: "number",
        description: "Maximum number of rows to return (default is 100)",
      }
    },
  },
};

export async function getCouplingHandler(args: {
  packageOrigem?: string;
  packageChamada?: string;
  moduloOrigem?: string;
  moduloChamado?: string;
  maxRows?: number;
}) {
  return withConnection(async (connection) => {
    const { packageOrigem, packageChamada, moduloOrigem, moduloChamado, maxRows = 100 } = args || {};

    let query = `
      SELECT 
        PACKAGE_ORIGEM,
        PACKAGE_CHAMADA,
        MODULO_ORIGEM,
        MODULO_CHAMADO
      FROM acoplamento_siga
      WHERE 1=1
    `;
    const binds: Record<string, string> = {};

    if (packageOrigem) {
      query += ` AND UPPER(PACKAGE_ORIGEM) LIKE UPPER(:packageOrigem)`;
      binds.packageOrigem = `%${packageOrigem}%`;
    }
    if (packageChamada) {
      query += ` AND UPPER(PACKAGE_CHAMADA) LIKE UPPER(:packageChamada)`;
      binds.packageChamada = `%${packageChamada}%`;
    }
    if (moduloOrigem) {
      query += ` AND UPPER(MODULO_ORIGEM) LIKE UPPER(:moduloOrigem)`;
      binds.moduloOrigem = `%${moduloOrigem}%`;
    }
    if (moduloChamado) {
      query += ` AND UPPER(MODULO_CHAMADO) LIKE UPPER(:moduloChamado)`;
      binds.moduloChamado = `%${moduloChamado}%`;
    }

    query += ` FETCH FIRST ${maxRows} ROWS ONLY`;

    const result = await connection.execute(query, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
    };
  });
}
