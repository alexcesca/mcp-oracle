import oracledb from "oracledb";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { withConnection } from "../db/pool.js";
export const getSobraAvcDefinition = {
    name: "get_sobra_avc",
    description: "Excuta a procedure PK_CAP_OBI.PKB_SOBRA_AVC para análise de sobras de ração de aves.",
    inputSchema: {
        type: "object",
        properties: {
            startDate: {
                type: "string",
                description: "Data de início da consulta (formato YYYY-MM-DD).",
            },
            endDate: {
                type: "string",
                description: "Data de fim da consulta (formato YYYY-MM-DD).",
            },
        },
        required: ["startDate", "endDate"],
    },
};
export async function getSobraAvcHandler(args) {
    if (!args.startDate || !args.endDate) {
        throw new McpError(ErrorCode.InvalidParams, "As datas de início e fim são obrigatórias.");
    }
    return withConnection(async (connection) => {
        const plsql = `
      DECLARE
        v_tab PK_CAP_OBI.T_TAB_REC_DDSLOTAVC;
        v_sis VARCHAR2(4000);
        v_proc VARCHAR2(4000);
        v_msg VARCHAR2(4000);
        v_err NUMBER;
        v_clob CLOB;
        v_buffer VARCHAR2(32767);
      BEGIN
        -- Executa a procedure
        PK_CAP_OBI.PKB_SOBRA_AVC(
          TO_DATE(:startDate, 'YYYY-MM-DD'),
          TO_DATE(:endDate, 'YYYY-MM-DD'),
          v_tab,
          v_sis,
          v_proc,
          v_msg,
          v_err
        );

        IF v_err <> 0 THEN
          raise_application_error(-20001, 'Erro na procedure: ' || v_msg);
        END IF;

        DBMS_LOB.CREATETEMPORARY(v_clob, TRUE);
        DBMS_LOB.APPEND(v_clob, '[');
        
        IF v_tab.COUNT > 0 THEN
          FOR i IN 1 .. v_tab.COUNT LOOP
            IF i > 1 THEN
              DBMS_LOB.APPEND(v_clob, ',');
            END IF;

            -- Usando JSON_OBJECT para garantir a formatação correta dos campos
            -- Nota: O Oracle 19c suporta JSON_OBJECT.
            -- Dividimos em sub-objetos se necessário para evitar limites, mas aqui vamos tentar direto.
            
            SELECT JSON_OBJECT(
              'cd_fili' VALUE v_tab(i).cd_fili,
              'nome_fili' VALUE v_tab(i).nome_fili,
              'fili_id' VALUE v_tab(i).fili_id,
              'cd_asso' VALUE v_tab(i).cd_asso,
              'nome_asso' VALUE v_tab(i).nome_asso,
              'asso_id' VALUE v_tab(i).asso_id,
              'cd_prop' VALUE v_tab(i).cd_prop,
              'nome_prop' VALUE v_tab(i).nome_prop,
              'prop_id' VALUE v_tab(i).prop_id,
              'cd_aviario' VALUE v_tab(i).cd_aviario,
              'avialotcam_id' VALUE v_tab(i).avialotcam_id,
              'cd_lotcamaves' VALUE v_tab(i).cd_lotcamaves,
              'lotcamaves_id' VALUE v_tab(i).lotcamaves_id,
              'cd_usu' VALUE v_tab(i).cd_usu,
              'nome_usu' VALUE v_tab(i).nome_usu,
              'usu_id' VALUE v_tab(i).usu_id,
              'cd_item' VALUE v_tab(i).cd_item,
              'descr_item' VALUE v_tab(i).descr_item,
              'item_id' VALUE v_tab(i).item_id,
              'iditeraatv_id' VALUE v_tab(i).iditeraatv_id,
              'cd_unid' VALUE v_tab(i).cd_unid,
              'nome_unid' VALUE v_tab(i).nome_unid,
              'abrev_unid' VALUE v_tab(i).abrev_unid,
              'unid_id_racao' VALUE v_tab(i).unid_id_racao,
              'cd_assis' VALUE v_tab(i).cd_assis,
              'nome_assis' VALUE v_tab(i).nome_assis,
              'assistecn_id' VALUE v_tab(i).assistecn_id,
              'tp_sobra' VALUE v_tab(i).tp_sobra,
              'descr_sobra' VALUE v_tab(i).descr_sobra,
              'qtde_entregue' VALUE v_tab(i).qtde_entregue,
              'qtde_sobra' VALUE v_tab(i).qtde_sobra,
              'qtde_sobra_p_ave' VALUE v_tab(i).qtde_sobra_p_ave,
              'dt_fecha' VALUE TO_CHAR(v_tab(i).dt_fecha, 'YYYY-MM-DD"T"HH24:MI:SS'),
              'cd_unid_abate' VALUE v_tab(i).cd_unid_abate,
              'nome_unid_abate' VALUE v_tab(i).nome_unid_abate,
              'abrev_unid_abate' VALUE v_tab(i).abrev_unid_abate,
              'unid_id_abate' VALUE v_tab(i).unid_id_abate,
              'avessexotv_id' VALUE v_tab(i).avessexotv_id,
              'cd_avessexotv' VALUE v_tab(i).cd_avessexotv,
              'descr_avessexotv' VALUE v_tab(i).descr_avessexotv,
              'cd_usu_detsobraav' VALUE v_tab(i).cd_usu_detsobraav,
              'nome_usu_detsobraav' VALUE v_tab(i).nome_usu_detsobraav,
              'usu_id_detsobraav' VALUE v_tab(i).usu_id_detsobraav,
              'obs_detsobraav' VALUE v_tab(i).obs_detsobraav,
              'detsobraav_id' VALUE v_tab(i).detsobraav_id,
              'cd_tpnconfagr' VALUE v_tab(i).cd_tpnconfagr,
              'descr_tpnconfagr' VALUE v_tab(i).descr_tpnconfagr,
              'tpnconfagr_id' VALUE v_tab(i).tpnconfagr_id
            ) INTO v_buffer FROM DUAL;
            
            DBMS_LOB.APPEND(v_clob, v_buffer);
          END LOOP;
        END IF;

        DBMS_LOB.APPEND(v_clob, ']');
        :result := v_clob;
      END;
    `;
        const result = await connection.execute(plsql, {
            startDate: args.startDate,
            endDate: args.endDate,
            result: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
        });
        const outBinds = result.outBinds;
        const clob = outBinds.result;
        const jsonString = await clob.getData();
        return {
            content: [
                {
                    type: "text",
                    text: jsonString,
                },
            ],
        };
    });
}
