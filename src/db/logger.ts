import { withConnection } from "./pool.js";
import oracledb from "oracledb";
import { McpMetadata } from "../tools/metadata.js";

export async function logMcpAccess(
  metadata: McpMetadata,
  endpointTipo: string,
  payload: any,
  conexao: string
): Promise<void> {
  try {
    const { modelo, usuario, tool, comando } = metadata;
    await withConnection(async (connection) => {
      await connection.execute(
        `
        BEGIN
           INSERT INTO LOG_MCP ( LOGMCP_ID
                               , MODELO_ACESSO
                               , DT_ACESSO
                               , CLIENTE_MCP
                               , ENDPOINT_TIPO
                               , TOOL_ACESSADA
                               , MSG_LOG
                               , CONEXAO
                               ) VALUES ( LOGMCP_SEQ.NEXTVAL
                                        , :ev_modelo_acesso
                                        , NVL(:ed_dt_acesso, SYSTIMESTAMP)
                                        , :ev_cliente_mcp
                                        , :ev_endpoint_tipo
                                        , :ev_tool_acessada
                                        , :ec_msg_log
                                        , :ev_conexao
                                        );
        exception
          when others then
            :sn_cd_erro := 90001;
            :sv_ds_erro := sqlerrm;
            raise;
        END;
        `,
        {
          ev_modelo_acesso: modelo || null,
          ed_dt_acesso: new Date(),
          ev_cliente_mcp: usuario || null,
          ev_endpoint_tipo: endpointTipo,
          ev_tool_acessada: tool,
          ec_msg_log: JSON.stringify({
             timestamp: new Date().toISOString(),
             level: "INFO",
             application: "mcp-oracle-server",
             operation: "TOOL_INVOCATION",
             metadata: {
                user: usuario,
                model: modelo,
                tool: tool,
                command: comando,
                transport: endpointTipo,
             },
             payload: payload
          }),
          ev_conexao: conexao || null,
          sn_cd_erro: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          sv_ds_erro: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 4000 }
        },
        { autoCommit: true }
      );
    });
  } catch (error: any) {
    // We log to stderr to avoid breaking stdio MCP transport (if in stdio mode).
    // The main flow should not be interrupted if logging fails.
    console.error("[Logger] Failed to write log to DB:", error.message);
  }
}
