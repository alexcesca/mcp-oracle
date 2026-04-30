import oracledb from "oracledb";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { withConnection } from "../db/pool.js";
import { metadataSchema } from "./metadata.js";

export const getSobraAvcDefinition = {
  name: "get_sobra_avc",
  description: `A tool  retorna informações detalhadas sobre as sobras de aves em lotes, abrangendo dados relacionados à quantidade, identificação, e características dos lotes, bem como informações associadas a unidades, itens, usuários e configurações agronômicas. 
  As principais informações retornadas incluem:

    Quantidade de aves entregues no lote.
    Identificador do lote de aves como Código e nome da filial, associado, proprietário e aviário.
    Unidades de abate
    
`,
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
      page: {
        type: "number",
        description: "Número da página (inicia em 1, padrão: 1).",
        default: 1,
      },
      pageSize: {
        type: "number",
        description: "Quantidade de registros por página (padrão: 50).",
        default: 50,
      },
      metadata: metadataSchema,
    },
    required: ["startDate", "endDate", "metadata"],
  },
};

export async function getSobraAvcHandler(args: {
  startDate: string;
  endDate: string;
  page?: number;
  pageSize?: number;
}) {
  if (!args.startDate || !args.endDate) {
    throw new McpError(ErrorCode.InvalidParams, "As datas de início e fim são obrigatórias.");
  }

  const page = args.page || 1;
  const pageSize = args.pageSize || 100;

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
        v_total NUMBER;
        v_start NUMBER;
        v_end NUMBER;
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

        v_total := v_tab.COUNT;
        v_start := ((:page - 1) * :pageSize) + 1;
        v_end := LEAST(:page * :pageSize, v_total);

        DBMS_LOB.CREATETEMPORARY(v_clob, TRUE);
        DBMS_LOB.APPEND(v_clob, '{"pagination": {');
        DBMS_LOB.APPEND(v_clob, '"total": ' || v_total || ',');
        DBMS_LOB.APPEND(v_clob, '"page": ' || :page || ',');
        DBMS_LOB.APPEND(v_clob, '"pageSize": ' || :pageSize || ',');
        DBMS_LOB.APPEND(v_clob, '"pages": ' || CEIL(v_total / GREATEST(:pageSize, 1)));
        DBMS_LOB.APPEND(v_clob, '}, "data": [');
        
        IF v_total >= v_start AND v_start > 0 THEN
          FOR i IN v_start .. v_end LOOP
            IF i > v_start THEN
              DBMS_LOB.APPEND(v_clob, ',');
            END IF;

            SELECT JSON_OBJECT(
              'cd_fili' VALUE v_tab(i).cd_fili,
              'nome_fili' VALUE v_tab(i).nome_fili, 
              'cd_asso' VALUE v_tab(i).cd_asso,
              'nome_asso' VALUE v_tab(i).nome_asso,
              'cd_prop' VALUE v_tab(i).cd_prop,
              'nome_prop' VALUE v_tab(i).nome_prop,
              'cd_aviario' VALUE v_tab(i).cd_aviario,
              'cd_lotcamaves' VALUE v_tab(i).cd_lotcamaves,
              'qtde_entregue' VALUE v_tab(i).qtde_entregue,
              'cd_unid_abate' VALUE v_tab(i).cd_unid_abate,
              'nome_unid_abate' VALUE v_tab(i).nome_unid_abate,
              'abrev_unid_abate' VALUE v_tab(i).abrev_unid_abate
            ) INTO v_buffer FROM DUAL;
            
            DBMS_LOB.APPEND(v_clob, v_buffer);
          END LOOP;
        END IF;

        DBMS_LOB.APPEND(v_clob, ']}');
        :result := v_clob;
      END;
    `;

    const result = await connection.execute(plsql, {
      startDate: args.startDate,
      endDate: args.endDate,
      page,
      pageSize,
      result: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
    });

    const outBinds = result.outBinds as any;
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
