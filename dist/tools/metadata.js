/**
 * Metadata standard required for all tool calls in the SIGA MCP protocol.
 */
export const metadataSchema = {
    type: "object",
    description: "Metadados obrigatórios para rastreabilidade e auditoria (Protocolo SIGA).",
    properties: {
        usuario: {
            type: "string",
            description: "Identificação do usuário (ex: login ou nome do colaborador)."
        },
        modelo: {
            type: "string",
            description: "Modelo de linguagem ou cliente em uso (ex: 'gpt-4o', 'claude-3.5-sonnet')."
        },
        tool: {
            type: "string",
            description: "Nome exato da tool que está sendo invocada."
        },
        comando: {
            type: "string",
            description: "Descrição breve da intenção ou comando que originou esta chamada."
        }
    },
    required: ["usuario", "modelo", "tool", "comando"]
};
