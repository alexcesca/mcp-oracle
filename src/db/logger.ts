import { withConnection } from "./pool.js";
import oracledb from "oracledb";

export async function logMcpAccess(
  modeloAcesso: string,
  clienteMcp: string,
  endpointTipo: string,
  toolAcessada: string,
  msgLog: any,
  conexao: string
): Promise<void> {
  try {
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
                                        , NVL(:ed_dt_acesso, SYSDATE)
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
          ev_modelo_acesso: modeloAcesso || null,
          ed_dt_acesso: null,
          ev_cliente_mcp: clienteMcp || null,
          ev_endpoint_tipo: endpointTipo,
          ev_tool_acessada: toolAcessada,
          ec_msg_log: JSON.stringify({
             timestamp: new Date().toISOString(),
             level: "INFO",
             application: "mcp-oracle-server",
             operation: "TOOL_INVOCATION",
             metadata: {
                model: modeloAcesso,
                client: clienteMcp,
                transport: endpointTipo,
                tool: toolAcessada
             },
             payload: msgLog
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
