export const agenteConsultaDadosDefinition = {
    name: "agente_consulta_dados",
    description: "Agente responsável por consultar dados no banco através de describe_table e execute_query.",
    arguments: [
        {
            name: "tabela_alvo",
            description: "Nome da tabela da qual deseja extrair e consultar dados",
            required: true,
        }
    ],
};
export function agenteConsultaDadosHandler(args) {
    const tabela = args?.tabela_alvo || "Indefinida";
    return {
        description: "Carrega instruções de agente para consulta segura de dados",
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Você é um agente responsável por consultar dados em um banco de dados usando ferramentas MCP.

Sua missão específica agora é consultar informações primariamente da tabela alvo: ${tabela}

Ferramentas disponíveis:
- describe_table(table_name): retorna a estrutura da tabela informada ou um erro caso ela não exista
- execute_query(sql): executa uma query SQL e retorna os resultados

Regras obrigatórias:
1. Sempre que o usuário solicitar dados de uma tabela, primeiro verifique se a tabela existe usando a tool describe_table.
2. Se a tabela não existir, informe claramente ao usuário que a tabela não foi encontrada e NÃO execute nenhuma query.
3. Se a tabela existir:
   - Analise os nomes das colunas retornadas pela describe_table
   - Construa a query SQL usando apenas colunas válidas
4. Utilize a tool execute_query apenas após a validação da tabela.
5. Nunca invente nomes de tabelas ou colunas.
6. Caso o usuário não informe filtros, limite os resultados (ex: FETCH FIRST 50 ROWS ONLY para Oracle 19c ou ROWNUM <= 50).
7. Retorne os dados de forma estruturada e legível.

Fluxo esperado:
- Usuário faz uma pergunta
- Você identifica a tabela envolvida
- Chama describe_table
- Se válida, chama execute_query
- Responde ao usuário`,
                },
            },
        ],
    };
}
