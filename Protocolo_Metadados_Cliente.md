# Guia de Implementação: Metadados do Protocolo SIGA (MCP Oracle)

Este documento descreve como os clientes do servidor MCP Oracle devem enviar os metadados obrigatórios para cumprir o padrão de auditoria e rastreabilidade SIGA.

## 1. Estrutura do Objeto de Metadados

Todas as chamadas de ferramentas (**tools**) para este servidor exigem um objeto chamado `metadata` dentro dos argumentos.

### Campos Obrigatórios

| Campo | Tipo | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `usuario` | `string` | Identificação de quem está realizando a ação. | `alex.cesca` ou `sistema_vendas` |
| `modelo` | `string` | O modelo de IA ou versão do cliente em uso. | `claude-3-5-sonnet` ou `gpt-4o` |
| `tool` | `string` | Nome exato da ferramenta que está sendo chamada. | `describe_table` |
| `comando` | `string` | Descrição sucinta da intenção do usuário. | `Analisar estrutura da tabela EMP` |

---

## 2. Exemplos de Uso

### A. Chamada via JSON-RPC (Direto)

Se você estiver enviando comandos brutos para o servidor (via Stdio ou HTTP):

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "list_tables",
    "arguments": {
      "pattern": "BEM%",
      "metadata": {
        "usuario": "usuario.demonstracao",
        "modelo": "mcp-inspector",
        "tool": "list_tables",
        "comando": "Listar tabelas de bens imobilizados"
      }
    }
  }
}
```

### B. Uso via SDK TypeScript (@modelcontextprotocol/sdk)

```typescript
const result = await client.callTool("execute_query", {
  query: "SELECT count(*) FROM user_tables",
  metadata: {
    usuario: "dev.user",
    modelo: "my-custom-app-v1",
    tool: "execute_query",
    comando: "Contagem total de tabelas para dashboard"
  }
});
```

### C. Instrução para LLMs (System Prompt)

Se você estiver configurando uma ferramenta para um modelo de linguagem, certifique-se de que ele "compreenda" a obrigatoriedade. Como o esquema da ferramenta já define o `metadata` como `required`, o modelo deve preenchê-lo automaticamente, mas você pode reforçar:

> "Sempre que utilizar uma ferramenta do servidor mcp-oracle, preencha o objeto `metadata` com seu nome de modelo, o usuário atual, o nome da tool e uma breve descrição do que você está tentando fazer."

---

## 3. Validação e Erros

Se o objeto `metadata` estiver ausente ou incompleto, o servidor retornará um erro padrão MCP:

*   **Código**: `-32602` (InvalidParams)
*   **Mensagem**: `Protocolo SIGA: Metadados obrigatórios (metadata: { usuario, modelo, tool, comando }) não informados ou incompletos.`

---

## 4. Por que isso é necessário?

Esses dados são persistidos automaticamente na tabela `LOG_MCP` do banco de dados Oracle, permitindo:
1.  **Auditoria**: Saber quem executou qual comando.
2.  **Monitoramento de Custos**: Identificar quais modelos de IA estão consumindo mais recursos.
3.  **Depuração**: Rastrear a intenção do usuário (`comando`) em caso de erros de banco de dados.
