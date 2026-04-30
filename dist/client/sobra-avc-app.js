import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
async function run() {
    console.log("🚀 [App] Iniciando MCP App Orchestrator...");
    // Inicializando o transporte e apontando para o servidor local recém compilado
    const transport = new StdioClientTransport({
        command: "node",
        args: ["dist/index.js"],
        env: process.env // TypeScript cast to avoid undefined type errors
    });
    const client = new Client({ name: "sobra-avc-orchestrator", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);
    console.log("✅ [App] Conectado ao MCP Server local via STDIO.");
    // Configurações da consulta
    const startDate = "2024-01-01";
    const endDate = "2024-01-31"; // Período mensal para teste mais rápido
    const pageSize = 50;
    console.log(`📊 [App] Orquestrando chamada para get_sobra_avc.\nPeríodo: ${startDate} a ${endDate} (Páginas de ${pageSize})`);
    let allData = [];
    let currentPage = 1;
    let totalPages = 1;
    try {
        do {
            console.log(`\n⏳ [App] Solicitando Página ${currentPage}...`);
            const result = await client.callTool({
                name: "get_sobra_avc",
                arguments: {
                    startDate,
                    endDate,
                    page: currentPage,
                    pageSize,
                    metadata: {
                        usuario: "app_orchestrator", // usuário fake para o teste local
                        modelo: "client_script",
                        tool: "get_sobra_avc",
                        comando: "Busca orquestrada de dataset paginado (Teste de App)"
                    }
                }
            });
            // Validar retorno
            const content = result.content;
            if (!content || content.length === 0 || content[0].type !== "text") {
                throw new Error("Formato de retorno inválido: o tool não retornou texto JSON.");
            }
            const jsonStr = content[0].text;
            const parsed = JSON.parse(jsonStr);
            // Concatenar os dados recém-chegados
            if (parsed.data && Array.isArray(parsed.data)) {
                allData = allData.concat(parsed.data);
            }
            // Analisar metadados de paginação
            if (parsed.pagination) {
                totalPages = parsed.pagination.pages;
                console.log(`✅ [App] Recebida Página ${parsed.pagination.page} de ${totalPages}. Registros: ${parsed.data?.length || 0}`);
            }
            else {
                // Fallback se não existir paginação
                console.log(`✅ [App] Recebidos ${parsed.data?.length || 0} registros.`);
            }
            currentPage++;
        } while (currentPage <= totalPages);
        console.log(`\n🎉 [App] Orquestração concluída com sucesso! Total de registros agrupados: ${allData.length}`);
        if (allData.length > 0) {
            console.log("📌 Exemplo do primeiro registro consolidado:\n", JSON.stringify(allData[0], null, 2));
        }
    }
    catch (err) {
        if (err.code || err.message) {
            console.error("❌ [App] Erro na orquestração da Tool MCP:", err.message, err.code);
        }
        else {
            console.error("❌ [App] Erro na execução da Tool:", err);
        }
    }
    finally {
        // Encerrar processo
        console.log("🛑 [App] Fechando conexão MCP server...");
        await transport.close();
    }
}
run().catch(console.error);
