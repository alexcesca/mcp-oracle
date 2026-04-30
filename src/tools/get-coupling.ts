import oracledb from "oracledb";
import { withConnection } from "../db/pool.js";
import { metadataSchema } from "./metadata.js";

export const getCouplingDefinition = {
  name: "get_coupling",
  description: "Analisa o acoplamento de módulos/pacotes com base na tabela acoplamento_siga. Pode filtrar por pacote de origem (package_origem), pacote chamado (package_chamada), módulo de origem (modulo_origem) e módulo chamado (modulo_chamado).",
  inputSchema: {
    type: "object",
    properties: {
      moduloChamador: {
        type: "string",
        description: "Filtrar pelo módulo do pacote de origem (MODULO_CHAMADOR)",
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
  moduloChamador?: string;
  moduloChamado?: string;
  maxRows?: number;
}) {
  return withConnection(async (connection) => {
    const { moduloChamador, moduloChamado, maxRows = 100 } = args || {};

    let query = `
      SELECT 
        modulo_chamador,
        modulo_chamado,
        qtde_chamada
      FROM acompalento_siga_resumo
      WHERE 1=1
    `;
    const binds: Record<string, string> = {};

    if (moduloChamador) {
      query += ` AND UPPER(modulo_chamador) LIKE UPPER(:moduloChamador)`;
      binds.moduloChamador = `%${moduloChamador}%`;
    }
    if (moduloChamado) {
      query += ` AND UPPER(modulo_chamado) LIKE UPPER(:moduloChamado)`;
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
