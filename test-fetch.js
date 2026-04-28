const oracledb = require('oracledb');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  const connection = await oracledb.getConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING
  });

  const sql = `
    DECLARE
      v_tab PK_CAP_OBI.T_TAB_REC_DDSLOTAVC;
      v_sis VARCHAR2(4000);
      v_proc VARCHAR2(4000);
      v_msg VARCHAR2(4000);
      v_err NUMBER;
      v_json CLOB;
    BEGIN
      PK_CAP_OBI.PKB_SOBRA_AVC(TO_DATE('2023-01-01', 'YYYY-MM-DD'), TO_DATE('2023-01-31', 'YYYY-MM-DD'), v_tab, v_sis, v_proc, v_msg, v_err);
      
      DBMS_OUTPUT.PUT_LINE('Count: ' || v_tab.COUNT);
      :out := v_tab.COUNT;
    END;
  `;

  const result = await connection.execute(sql, { out: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } });
  console.log(result.outBinds);
  await connection.close();
}

run().catch(console.error);
