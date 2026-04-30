export const analisarSobrasAvesDefinition = {
    name: "analisar_sobras_aves",
    description: "Inicia a análise e sumarização dos dados de sobras de aves (get_sobra_avc).",
    arguments: [
        {
            name: "data_inicial",
            description: "Data inicial da consulta (YYYY-MM-DD)",
            required: true,
        },
        {
            name: "data_final",
            description: "Data final da consulta (YYYY-MM-DD)",
            required: true,
        },
        {
            name: "solicitacao",
            description: "Formato ou detalhe de como sumarizar as informações devolvidas (ex: 'agrupar por unidade de abate', 'somar qtde_entregue')",
            required: true,
        },
    ],
};
export function analisarSobrasAvesHandler(args) {
    const dataInicial = args?.data_inicial || "não informado";
    const dataFinal = args?.data_final || "não informado";
    const solicitacao = args?.solicitacao || "sumarize os dados";
    return {
        description: "Carrega regras para execução e sumarização da tool get_sobra_avc.",
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Você é um analista especialista de dados operacionais do SIGA.
O usuário solicitou uma sumarização sobre os dados de aves entregues.

Dados fornecidos:
- Data Inicial: ${dataInicial}
- Data Final: ${dataFinal}
- Solicitação de Sumarização: ${solicitacao}

Regras Obrigatórias:
1. Execute a tool 'get_sobra_avc' usando 'startDate' como '${dataInicial}' e 'endDate' como '${dataFinal}', preenchendo obrigatoriamente o bloco de 'metadata' padrão exigido.
2. Como a tool retorna dados em formato JSON paginado (dentro do 'text', contendo um objeto 'pagination'), você DEVE observar o número total de páginas ('pages').
3. Caso existam mais páginas, continue iterando (incrementando a 'page') chamando a tool novamente até extrair todo o dataset do período solicitado.
4. Após consolidar as informações em memória, gere a SUMARIZAÇÃO analisando os campos (como qtde_entregue, nome_fili, nome_prop, etc.) para atender exatamente ao que foi pedido na solicitação: "${solicitacao}".
5. Devolva apenas o relatório útil e as análises formatadas para o usuário, sem despejar o JSON bruto na tela.
6. Por medida de precisão, após agrupar e somar os valores numéricos (como qtde_entregue), RECALCULE e VERIFIQUE os matematicamente passo a passo em seus pensamentos internos para garantir que o somatório final que você apresentar ao usuário está perfeitamente correto.`,
                },
            },
        ],
    };
}
