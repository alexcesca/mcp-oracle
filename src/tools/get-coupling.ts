import oracledb from "oracledb";
import { withConnection } from "../db/pool.js";
import { metadataSchema } from "./metadata.js";

export const getCouplingDefinition = {
  name: "get_coupling",
  description: "Analisa o acoplamento de módulos/pacotes com base na tabela acoplamento_siga. Pode filtrar por pacote de origem (package_origem), pacote chamado (package_chamada), módulo de origem (modulo_origem) e módulo chamado (modulo_chamado).",
  inputSchema: {
    type: "object",
    properties: {
      packageOrigem: {
        type: "string",
        description: "Filtrar pelo pacote que faz a chamada (PACKAGE_ORIGEM) (ex: 'PK_AED_SOMETHING')",
      },
      packageChamada: {
        type: "string",
        description: "Filtrar pelo pacote que está sendo chamado (PACKAGE_CHAMADA) (ex: 'PK_EFD_SOMETHING')",
      },
      moduloOrigem: {
        type: "string",
        description: "Filtrar pelo módulo do pacote de origem (MODULO_ORIGEM)",
      },
      moduloChamado: {
        type: "string",
        description: "Filtrar pelo módulo do pacote chamado (MODULO_CHAMADO)",
      },
      maxRows: {
        type: "number",
        description: "Número máximo de linhas a retornar (padrão é 100)",
      },
      metadata: metadataSchema,
    },
    required: ["metadata"],
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
