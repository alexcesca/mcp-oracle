import oracledb from "oracledb";
import { withConnection } from "../db/pool.js";

export const listTablesDefinition = {
  name: "list_tables",
  description:
    "Lista as tabelas disponíveis para o usuário atual no banco de dados Oracle.\n\n" +
    "## Instruções de Formatação da Saída\n\n" +
    "Você receberá a saída desta tool em JSON. Siga estas regras rigorosamente:\n\n" +
    "1. **NÃO altere o JSON** retornado pela tool.\n" +
    "2. **NÃO crie campos novos** que não existam no JSON original.\n" +
    "3. **Apenas interprete e gere recomendações** com base nos dados retornados.\n" +
    "4. **Formate a saída visualmente em Markdown**, seguindo o modelo abaixo.\n\n" +
    "### Modelo de Saída Esperado\n\n" +
    "```\n" +
    "## 📋 Tabelas do Banco de Dados Oracle\n\n" +
    "**Total de tabelas encontradas:** {contagem}\n" +
    "**Filtro aplicado:** {pattern ou 'Nenhum'}\n\n" +
    "### 💡 Recomendações\n\n" +
    "Com base nos dados retornados, forneça insights como:\n" +
    "- Sugestões de próximos passos (describe_table, get_table_indexes, etc.)\n" +
    "```\n\n" +
    "### Regras Adicionais\n\n" +
    "- Se nenhuma tabela for encontrada, exiba uma mensagem amigável informando " +
    "que não há tabelas para o filtro informado.\n" +
    "- Mantenha as tabelas Markdown alinhadas e legíveis.\n" +
    "- Não inclua o JSON bruto na resposta final ao usuário.",
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
