import oracledb from "oracledb";
import { withConnection } from "../db/pool.js";
import { metadataSchema } from "./metadata.js";

// ─── Tool Definition ────────────────────────────────────────────────────────

export const generateTablePackageDefinition = {
  name: "generate_table_package",
  description:
    "Gera um pacote Oracle PL/SQL completo compatível com o padrão SIGA (spec .pks + body .pkb) para uma determinada tabela. " +
    "Lê a estrutura da tabela no banco de dados (colunas, PK, sequences, domínios) e gera código pronto para uso " +
    "seguindo os padrões oficiais de desenvolvimento SIGA (Padrao_pl_sql.md).",
  inputSchema: {
    type: "object",
    properties: {
      tableName: {
        type: "string",
        description: "Nome da tabela Oracle para gerar o pacote (ex: 'TIPO_PESSOA_TV').",
      },
      moduleName: {
        type: "string",
        description:
          "Prefixo de abreviação do módulo (ex: 'AED', 'EFD', 'COR'). Usado para nomear o pacote: PK_[MODULO]_[NOME_CURTO]. Se omitido, o módulo é inferido ou deixado em branco.",
      },
      shortName: {
        type: "string",
        description:
          "Nome curto personalizado opcional para a tabela (ex: 'BEMIMOBEFD'). Se omitido, será derivado automaticamente do nome da tabela.",
      },
      author: {
        type: "string",
        description: "Nome do desenvolvedor para os comentários do cabeçalho. O padrão é 'Desenvolvedor'.",
      },
      metadata: metadataSchema,
    },
    required: ["tableName", "metadata"],
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface ColumnInfo {
  column_name: string;
  data_type: string;
  data_length: number;
  data_precision: number | null;
  data_scale: number | null;
  nullable: string;
  column_id: number;
}

interface DomainConstant {
  rv_meaning: string;
  rv_low_value: string;
  rv_domain: string;
  column_name: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deriveShortName(tableName: string): string {
  // Remove common suffixes like _TV, _EFD etc and concatenate parts
  const parts = tableName.toUpperCase().split("_").filter(p => p.length > 0);
  // Remove known module/suffix tokens if they appear consistently
  const knownSuffixes = ["TV", "EFD", "IPI", "ICMS", "PIS", "COFINS"];
  const filtered = parts.filter(p => !knownSuffixes.includes(p));
  // Take up to 10 chars from concatenation of parts, abbreviated
  return filtered.map(p => p.substring(0, Math.ceil(12 / filtered.length))).join("").substring(0, 12);
}

function getPrefixForType(colName: string, dataType: string): { param_in: string; param_out: string; local: string } {
  const name = colName.toLowerCase();
  if (dataType === "DATE" || dataType === "TIMESTAMP") return { param_in: "ed_", param_out: "sd_", local: "vd_" };
  if (dataType === "CLOB" || dataType === "BLOB")   return { param_in: "ec_", param_out: "sc_", local: "vc_" };
  if (dataType === "NUMBER")                          return { param_in: "en_", param_out: "sn_", local: "vn_" };
  return { param_in: "ev_", param_out: "sv_", local: "vv_" };
}

function isPkColumn(col: ColumnInfo, pkColumns: string[]): boolean {
  return pkColumns.includes(col.column_name.toUpperCase());
}

function isIdColumn(col: ColumnInfo): boolean {
  return col.column_name.toUpperCase().endsWith("_ID");
}

function pad(str: string, len: number): string {
  return str.padEnd(len, " ");
}

function today(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const SEPARATOR = "_".repeat(117);

function header(
  definition: string,
  params: Array<{ name: string; desc: string }>,
  returnDesc?: string
): string {
  const lines: string[] = [
    "/*",
    SEPARATOR,
    `Definição:        ${definition}`,
    SEPARATOR,
  ];
  if (params.length > 0) {
    lines.push(`Parâmetros:       ${params[0].name.padEnd(25)}${params[0].desc}`);
    for (let i = 1; i < params.length; i++) {
      lines.push(`                  ${params[i].name.padEnd(25)}${params[i].desc}`);
    }
    lines.push(SEPARATOR);
  }
  if (returnDesc) {
    lines.push(`Retorno:          ${returnDesc}`);
    lines.push(SEPARATOR);
  }
  lines.push("*/");
  return lines.join("\n   ");
}

// ─── Code Generators ─────────────────────────────────────────────────────────

function generateSpec(
  tableName: string,
  packageName: string,
  shortName: string,
  columns: ColumnInfo[],
  pkColumns: string[],
  seqName: string | null,
  domains: DomainConstant[],
  author: string
): string {
  const tbl = tableName.toLowerCase();
  const sn = shortName.toLowerCase();
  const PKG = packageName.toUpperCase();
  const lines: string[] = [];
  const L = (s = "") => lines.push(s);

  L(`PACKAGE ${PKG} IS`);
  L(`   ---`);
  L();

  // ── Domain constants (public) ──
  if (domains.length > 0) {
    L(`   -- -------------------------------------------------------------------------------------`);
    L(`   --  Constantes de domínio`);
    L(`   -- -------------------------------------------------------------------------------------`);
    const grouped: Record<string, DomainConstant[]> = {};
    for (const d of domains) {
      if (!grouped[d.column_name]) grouped[d.column_name] = [];
      grouped[d.column_name].push(d);
    }
    for (const [col, consts] of Object.entries(grouped)) {
      L(`   -- ${col}`);
      for (const c of consts) {
        const constName = c.rv_meaning.toUpperCase().replace(/[\s\-\/]+/g, "_").replace(/[^A-Z0-9_]/g, "").substring(0, 30);
        const fullType = `${tbl}.${col.toLowerCase()}%type`;
        L(`   ${pad(constName, 35)} constant ${pad(fullType, 45)} := ${c.rv_low_value};`);
      }
      L();
    }
  }

  // ── Main record type ──
  L(`   -- -------------------------------------------------------------------------------------`);
  L(`   --  Tipo de dados principal`);
  L(`   -- -------------------------------------------------------------------------------------`);
  const recType = `t_rec_${sn}`;
  const tabType = `t_tab_rec_${sn}`;

  // Calculate alignment width for record fields
  const maxColLen = Math.max(...columns.map(c => c.column_name.length));
  const fieldWidth = Math.max(maxColLen + 2, 25);

  L(`   type ${recType.padEnd(fieldWidth - 5 + recType.length - recType.length)} is record ( ${pad(columns[0].column_name.toLowerCase(), fieldWidth)}${tbl}.${columns[0].column_name.toLowerCase()}%type`);
  for (let i = 1; i < columns.length; i++) {
    const col = columns[i];
    const spaces = " ".repeat(`   type ${recType} is record ( `.length);
    L(`${spaces}, ${pad(col.column_name.toLowerCase(), fieldWidth)}${tbl}.${col.column_name.toLowerCase()}%type`);
  }
  L(`${"                            ".padEnd(`   type ${recType} is record ( `.length - 2)}  );`);
  L(`   type ${tabType.padEnd(30)} is table of ${recType.padEnd(25)} index by binary_integer;`);
  L();

  // ── FKG_SEQ ──
  if (seqName) {
    L(`   -- -------------------------------------------------------------------------------------`);
    L(`   --  Funções`);
    L(`   -- -------------------------------------------------------------------------------------`);
    L(`   FUNCTION  FKG_SEQ                   RETURN ${tbl}.${pkColumns[0]?.toLowerCase() || "id"}%type;`);
    L();
  }

  // ── Standard procedures ──
  L(`   -- -------------------------------------------------------------------------------------`);
  L(`   --  Procedures padrão`);
  L(`   -- -------------------------------------------------------------------------------------`);

  const standardProcs = [
    { name: `PKB_VAL_${shortName}`, desc: "Validação dos dados" },
    { name: `PKB_CON_${shortName}`, desc: "Consulta genérica" },
    { name: `PKB_INC_${shortName}`, desc: "Inclusão de registros" },
    { name: `PKB_ALT_${shortName}`, desc: "Alteração de registros" },
    { name: `PKB_EXC_${shortName}`, desc: "Exclusão de registros" },
    { name: `PKB_LOC_${shortName}`, desc: "Lock de registros" },
    { name: `PKB_VALIDA`, desc: "Busca por Unique Key" },
    { name: `PKB_POSTQUER`, desc: "Busca por ID (retorna 1 registro)" },
    { name: `PKB_LOV`, desc: "Lista de valores" },
  ];

  // Build parameter lists for each procedure
  const commonOutParams = [
    `sv_sistema               out nocopy varchar2`,
    `sv_processo              out nocopy varchar2`,
    `sv_msg_erro              out nocopy varchar2`,
    `sn_cd_erro               out nocopy number`,
  ];

  // PKB_VAL - id or pk col as input
  const idCol = pkColumns[0]?.toLowerCase() || `${sn}_id`;
  const idPrefix = "en_";
  emitProc(`PKB_VAL_${shortName}`, [
    `${idPrefix}${idCol}             in            ${tbl}.${idCol}%type`,
    ...commonOutParams,
  ], lines, tbl, sn, "Validação dos dados da tabela");

  // PKB_CON - searchable columns as input
  const searchCols = columns.filter(c => !isPkColumn(c, pkColumns)).slice(0, 4);
  const conParams: string[] = [];
  for (const c of searchCols) {
    const { param_in } = getPrefixForType(c.column_name, c.data_type);
    conParams.push(`${param_in}${c.column_name.toLowerCase().padEnd(22)}in            ${tbl}.${c.column_name.toLowerCase()}%type`);
  }
  conParams.push(`est_${sn.padEnd(25)}in out nocopy ${tabType}`);
  conParams.push(...commonOutParams);
  emitProc(`PKB_CON_${shortName}`, conParams, lines, tbl, sn, "Consulta genérica na tabela");

  // PKB_INC
  emitProc(`PKB_INC_${shortName}`, [
    `est_${sn.padEnd(25)}in out nocopy ${tabType}`,
    ...commonOutParams,
  ], lines, tbl, sn, "Inclusão de registros");

  // PKB_ALT
  emitProc(`PKB_ALT_${shortName}`, [
    `est_${sn.padEnd(25)}in out nocopy ${tabType}`,
    ...commonOutParams,
  ], lines, tbl, sn, "Alteração de registros");

  // PKB_EXC
  emitProc(`PKB_EXC_${shortName}`, [
    `est_${sn.padEnd(25)}in out nocopy ${tabType}`,
    ...commonOutParams,
  ], lines, tbl, sn, "Exclusão de registros");

  // PKB_LOC
  emitProc(`PKB_LOC_${shortName}`, [
    `est_${sn.padEnd(25)}in out nocopy ${tabType}`,
    ...commonOutParams,
  ], lines, tbl, sn, "Lock de registros");

  // PKB_VALIDA
  const ukCols = columns.filter(c => !isPkColumn(c, pkColumns)).slice(0, 2);
  const validaParams: string[] = ukCols.map(c => {
    const { param_in } = getPrefixForType(c.column_name, c.data_type);
    return `${param_in}${c.column_name.toLowerCase().padEnd(22)}in            ${tbl}.${c.column_name.toLowerCase()}%type`;
  });
  validaParams.push(`st_${sn.padEnd(26)}   out nocopy ${tabType}`);
  validaParams.push(...commonOutParams);
  emitProc("PKB_VALIDA", validaParams, lines, tbl, sn, "Busca por Unique Key - retorna 1 registro na posição 1");

  // PKB_POSTQUER
  emitProc("PKB_POSTQUER", [
    `${idPrefix}${idCol.padEnd(25)}in            ${tbl}.${idCol}%type`,
    `st_${sn.padEnd(26)}   out nocopy ${tabType}`,
    ...commonOutParams,
  ], lines, tbl, sn, "Busca por ID - retorna 1 registro");

  // PKB_LOV
  emitProc("PKB_LOV", [
    `st_${sn.padEnd(26)}   out nocopy ${tabType}`,
    ...commonOutParams,
  ], lines, tbl, sn, "Lista de valores ordenada por descrição");

  L();
  L(`END ${PKG};`);

  return lines.join("\n");
}

function emitProc(name: string, params: string[], lines: string[], tbl: string, sn: string, _desc: string) {
  const maxNameLen = Math.max(...params.map(p => p.split(/\s+/)[0].length));
  lines.push(`   PROCEDURE ${pad(name, 25)} ( ${params[0]}`);
  for (let i = 1; i < params.length; i++) {
    lines.push(`${"".padEnd(`   PROCEDURE ${pad(name, 25)} ( `.length)}, ${params[i]}`);
  }
  lines.push(`${"".padEnd(`   PROCEDURE ${pad(name, 25)} ( `.length - 1)});`);
  lines.push("");
}

function generateBody(
  tableName: string,
  packageName: string,
  shortName: string,
  columns: ColumnInfo[],
  pkColumns: string[],
  seqName: string | null,
  author: string
): string {
  const tbl = tableName.toLowerCase();
  const sn = shortName.toLowerCase();
  const PKG = packageName.toUpperCase();
  const tabType = `t_tab_rec_${sn}`;
  const idCol = pkColumns[0]?.toLowerCase() || `${sn}_id`;
  const lines: string[] = [];
  const L = (s = "") => lines.push(s);
  const dt = today();

  L(`PACKAGE BODY ${PKG} IS`);
  L(`   ---`);
  L();
  L(`   -- User Exceptions`);
  L(`   ve_erro              exception;`);
  L(`   ve_erro_pk           exception;`);
  L();
  L(`   -- -------------------------------------------------------------------------------------`);
  L(`   --  FUNÇÕES`);
  L(`   -- -------------------------------------------------------------------------------------`);
  L();

  // ── FKG_SEQ ──
  if (seqName) {
    L(`   /*`);
    L(`   ${SEPARATOR}`);
    L(`   Desenvolvido por: ${author}`);
    L(`   Data:             ${dt}`);
    L(`   ${SEPARATOR}`);
    L(`   Definição:        Retorna a próxima sequência da tabela ${tbl}`);
    L(`   ${SEPARATOR}`);
    L(`   Retorno:          Próximo valor da sequence ${seqName}`);
    L(`   ${SEPARATOR}`);
    L(`   */`);
    L(`   FUNCTION FKG_SEQ RETURN ${tbl}.${idCol}%type IS`);
    L();
    L(`      vn_${idCol.padEnd(20)} ${tbl}.${idCol}%type;`);
    L();
    L(`   BEGIN`);
    L();
    L(`      select ${seqName}.nextval`);
    L(`        into vn_${idCol}`);
    L(`        from dual;`);
    L();
    L(`      return (vn_${idCol});`);
    L();
    L(`   EXCEPTION`);
    L(`      when others then`);
    L(`         raise_application_error(-20001, 'Erro em ${PKG}.FKG_SEQ - ' || sqlerrm);`);
    L(`   END FKG_SEQ;`);
    L();
  }

  L(`   -- -------------------------------------------------------------------------------------`);
  L(`   --  PROCEDURES`);
  L(`   -- -------------------------------------------------------------------------------------`);
  L();

  // ── PKB_VAL ──
  emitBodyProc("PKB_VAL", `Validação dos dados da tabela ${tbl}`, [
    { name: `en_${idCol}`, desc: `ID do registro` },
  ], [
    `      -- TODO: implementar validações de negócio`,
    `      null;`,
  ], PKG, `PKB_VAL_${shortName.toUpperCase()}`, lines, author, dt);
  L();

  // ── PKB_CON ──
  const searchCols = columns.filter(c => !isPkColumn(c, pkColumns)).slice(0, 3);
  const conWheres = searchCols.map((c, i) => {
    const { param_in } = getPrefixForType(c.column_name, c.data_type);
    const pname = `${param_in}${c.column_name.toLowerCase()}`;
    return `      if ${pname} is not null then\n         vv_sql := vv_sql || ' and t.${c.column_name.toLowerCase()} = :${pname}';\n      end if;`;
  });
  const colList = columns.map(c => `                         , t.${c.column_name.toLowerCase()}`).join("\n");
  const conBody = [
    `      cur_1      sys_refcursor;`,
    `      vn_indice  pls_integer := 0;`,
    `      vv_sql     varchar2(32767);`,
    ``,
    `   BEGIN`,
    ``,
    `      est_${sn}.delete;`,
    ``,
    `      vv_sql := 'select t.${columns[0].column_name.toLowerCase()}`,
    ...columns.slice(1).map(c => `                       , t.${c.column_name.toLowerCase()}`),
    `                  from ${tbl} t`,
    `                 where 1 = 1';`,
    ``,
    ...conWheres,
    ``,
    `      begin`,
    `         open cur_1 for vv_sql;`,
    `      exception`,
    `         when others then`,
    `            sn_cd_erro := 90001;`,
    `            raise;`,
    `      end;`,
    ``,
    `      loop`,
    `         vn_indice := vn_indice + 1;`,
    `         fetch cur_1 into est_${sn}(vn_indice);`,
    `         exit when cur_1%notfound;`,
    `      end loop;`,
    ``,
    `      close cur_1;`,
    ``,
  ];
  emitBodyProc("PKB_CON", `Consulta genérica da tabela ${tbl}`, searchCols.map(c => {
    const { param_in } = getPrefixForType(c.column_name, c.data_type);
    return { name: `${param_in}${c.column_name.toLowerCase()}`, desc: `Filtro por ${c.column_name.toLowerCase()}` };
  }).concat([{ name: `est_${sn}`, desc: "Registros encontrados" }]),
    conBody, PKG, `PKB_CON_${shortName.toUpperCase()}`, lines, author, dt, true);
  L();

  // ── PKB_INC ──
  const incBody = buildInsert(tbl, columns, pkColumns, seqName, shortName, PKG);
  emitBodyProc("PKB_INC", `Inclusão de registros na tabela ${tbl}`,
    [{ name: `est_${sn}`, desc: "Registros a inserir" }],
    incBody, PKG, `PKB_INC_${shortName.toUpperCase()}`, lines, author, dt, true);
  L();

  // ── PKB_ALT ──
  const altBody = buildUpdate(tbl, columns, pkColumns, shortName, PKG);
  emitBodyProc("PKB_ALT", `Alteração de registros na tabela ${tbl}`,
    [{ name: `est_${sn}`, desc: "Registros a alterar" }],
    altBody, PKG, `PKB_ALT_${shortName.toUpperCase()}`, lines, author, dt, true);
  L();

  // ── PKB_EXC ──
  emitBodyProc("PKB_EXC", `Exclusão de registros da tabela ${tbl}`,
    [{ name: `est_${sn}`, desc: "Registros a excluir (deve conter o ID)" }],
    [
      `      begin`,
      `         delete from ${tbl}`,
      `          where ${idCol} = est_${sn}(1).${idCol};`,
      `      exception`,
      `         when others then`,
      `            sn_cd_erro := 90001;`,
      `            raise;`,
      `      end;`,
      ``,
    ],
    PKG, `PKB_EXC_${shortName.toUpperCase()}`, lines, author, dt, true);
  L();

  // ── PKB_LOC ──
  emitBodyProc("PKB_LOC", `Lock de registros da tabela ${tbl}`,
    [{ name: `est_${sn}`, desc: "Registro a bloquear" }],
    [
      `      begin`,
      `         select ${idCol}`,
      `           into est_${sn}(1).${idCol}`,
      `           from ${tbl}`,
      `          where ${idCol} = est_${sn}(1).${idCol}`,
      `            for update nowait;`,
      `      exception`,
      `         when others then`,
      `            sn_cd_erro := 90001;`,
      `            raise;`,
      `      end;`,
      ``,
    ],
    PKG, `PKB_LOC_${shortName.toUpperCase()}`, lines, author, dt, true);
  L();

  // ── PKB_VALIDA ──
  const ukCols = columns.filter(c => !isPkColumn(c, pkColumns)).slice(0, 2);
  const ukParams = ukCols.map(c => {
    const { param_in } = getPrefixForType(c.column_name, c.data_type);
    return { name: `${param_in}${c.column_name.toLowerCase()}`, desc: `Filtro UK ${c.column_name.toLowerCase()}` };
  });
  const validaBody = buildValida(tbl, columns, pkColumns, ukCols, shortName);
  emitBodyProc("PKB_VALIDA", `Busca por Unique Key - retorna 1 registro`,
    [...ukParams, { name: `st_${sn}`, desc: "Registro encontrado (posição 1)" }],
    validaBody, PKG, "PKB_VALIDA", lines, author, dt, true);
  L();

  // ── PKB_POSTQUER ──
  emitBodyProc("PKB_POSTQUER", `Busca por ID - retorna 1 registro`,
    [{ name: `en_${idCol}`, desc: "ID do registro" }, { name: `st_${sn}`, desc: "Registro encontrado (posição 1)" }],
    buildPostquer(tbl, columns, idCol, shortName),
    PKG, "PKB_POSTQUER", lines, author, dt, true);
  L();

  // ── PKB_LOV ──
  const descrCol = columns.find(c => c.column_name.toLowerCase().includes("descr"))
    || columns.find(c => c.column_name.toLowerCase().includes("nome"))
    || columns[1];
  emitBodyProc("PKB_LOV", `Lista de valores ordenada`,
    [{ name: `st_${sn}`, desc: "Registros encontrados" }],
    buildLov(tbl, columns, descrCol?.column_name.toLowerCase() || "cd", shortName),
    PKG, "PKB_LOV", lines, author, dt, true);
  L();

  L(`END ${PKG};`);

  return lines.join("\n");
}

function emitBodyProc(
  name: string,
  definition: string,
  params: Array<{ name: string; desc: string }>,
  bodyLines: string[],
  pkg: string,
  qualifiedName: string,
  lines: string[],
  author: string,
  dt: string,
  hasVarSection = false
) {
  lines.push(`   /*`);
  lines.push(`   ${SEPARATOR}`);
  lines.push(`   Desenvolvido por: ${author}`);
  lines.push(`   Data:             ${dt}`);
  lines.push(`   ${SEPARATOR}`);
  lines.push(`   Definição:        ${definition}`);
  lines.push(`   ${SEPARATOR}`);
  if (params.length > 0) {
    lines.push(`   Parâmetros:       ${params[0].name.padEnd(25)}${params[0].desc}`);
    for (let i = 1; i < params.length; i++) {
      lines.push(`                     ${params[i].name.padEnd(25)}${params[i].desc}`);
    }
    lines.push(`   ${SEPARATOR}`);
  }
  lines.push(`   */`);
  lines.push(`   PROCEDURE ${name} IS`);
  lines.push(``);
  if (!hasVarSection) lines.push(`   BEGIN`);
  lines.push(...bodyLines);
  lines.push(`   EXCEPTION`);
  lines.push(`      when ve_erro then`);
  lines.push(`         sv_sistema  := '${pkg.split("_")[1] || pkg}';`);
  lines.push(`         sv_processo := '${pkg}.${qualifiedName}';`);
  lines.push(`         sn_cd_erro  := nvl(sn_cd_erro, 90000);`);
  lines.push(`         pk_soft.pkb_busca_msg_erro ( en_cd       => sn_cd_erro`);
  lines.push(`                                    , ev_sg_sist  => sv_sistema`);
  lines.push(`                                    , ev_objeto   => sv_processo`);
  lines.push(`                                    , sv_msg_erro => sv_msg_erro`);
  lines.push(`                                    );`);
  lines.push(`      when others then`);
  lines.push(`         sv_sistema  := '${pkg.split("_")[1] || pkg}';`);
  lines.push(`         sv_processo := '${pkg}.${qualifiedName}';`);
  lines.push(`         sn_cd_erro  := nvl(sn_cd_erro, 90000);`);
  lines.push(`         pk_soft.pkb_busca_msg_erro ( en_cd       => sqlcode`);
  lines.push(`                                    , ev_sg_sist  => sv_sistema`);
  lines.push(`                                    , ev_objeto   => sv_processo`);
  lines.push(`                                    , sv_msg_erro => sv_msg_erro`);
  lines.push(`                                    );`);
  lines.push(`   END ${name};`);
}

function buildInsert(tbl: string, columns: ColumnInfo[], pkColumns: string[], seqName: string | null, shortName: string, pkg: string): string[] {
  const sn = shortName.toLowerCase();
  const idCol = pkColumns[0]?.toLowerCase() || `${sn}_id`;
  const lines: string[] = [];
  lines.push(`      begin`);
  lines.push(`         ${seqName ? `est_${sn}(1).${idCol} := FKG_SEQ;` : `-- assign PK manually`}`);
  lines.push(``);
  lines.push(`         insert into ${tbl}`);
  lines.push(`                  ( ${columns[0].column_name.toLowerCase()}`);
  for (let i = 1; i < columns.length; i++) {
    lines.push(`                  , ${columns[i].column_name.toLowerCase()}`);
  }
  lines.push(`                  ) values`);
  lines.push(`                  ( est_${sn}(1).${columns[0].column_name.toLowerCase()}`);
  for (let i = 1; i < columns.length; i++) {
    lines.push(`                  , est_${sn}(1).${columns[i].column_name.toLowerCase()}`);
  }
  lines.push(`                  );`);
  lines.push(`      exception`);
  lines.push(`         when dup_val_on_index then`);
  lines.push(`            sn_cd_erro := 2;`);
  lines.push(`            raise ve_erro;`);
  lines.push(`         when others then`);
  lines.push(`            sn_cd_erro := 90001;`);
  lines.push(`            raise;`);
  lines.push(`      end;`);
  lines.push(``);
  return lines;
}

function buildUpdate(tbl: string, columns: ColumnInfo[], pkColumns: string[], shortName: string, pkg: string): string[] {
  const sn = shortName.toLowerCase();
  const idCol = pkColumns[0]?.toLowerCase() || `${sn}_id`;
  const updCols = columns.filter(c => !isPkColumn(c, pkColumns));
  const lines: string[] = [];
  lines.push(`      begin`);
  lines.push(`         update ${tbl}`);
  lines.push(`            set ${updCols[0].column_name.toLowerCase()} = est_${sn}(1).${updCols[0].column_name.toLowerCase()}`);
  for (let i = 1; i < updCols.length; i++) {
    lines.push(`              , ${updCols[i].column_name.toLowerCase()} = est_${sn}(1).${updCols[i].column_name.toLowerCase()}`);
  }
  lines.push(`          where ${idCol} = est_${sn}(1).${idCol};`);
  lines.push(`      exception`);
  lines.push(`         when dup_val_on_index then`);
  lines.push(`            sn_cd_erro := 3;`);
  lines.push(`            raise ve_erro;`);
  lines.push(`         when others then`);
  lines.push(`            sn_cd_erro := 90001;`);
  lines.push(`            raise;`);
  lines.push(`      end;`);
  lines.push(``);
  return lines;
}

function buildValida(tbl: string, columns: ColumnInfo[], pkColumns: string[], ukCols: ColumnInfo[], shortName: string): string[] {
  const sn = shortName.toLowerCase();
  const lines: string[] = [];
  lines.push(`   BEGIN`);
  lines.push(``);
  lines.push(`      st_${sn}.delete;`);
  lines.push(``);
  lines.push(`      begin`);
  lines.push(`         select ${columns.map(c => `t.${c.column_name.toLowerCase()}`).join(`\n                      , `)}`);
  lines.push(`           into st_${sn}(1)`);
  lines.push(`           from ${tbl} t`);
  for (const c of ukCols) {
    const { param_in } = getPrefixForType(c.column_name, c.data_type);
    lines.push(`          where t.${c.column_name.toLowerCase()} = ${param_in}${c.column_name.toLowerCase()}`);
  }
  lines.push(`            rownum = 1;`);
  lines.push(`      exception`);
  lines.push(`         when no_data_found then`);
  lines.push(`            sn_cd_erro := 1;`);
  lines.push(`            raise ve_erro;`);
  lines.push(`         when others then`);
  lines.push(`            sn_cd_erro := 90001;`);
  lines.push(`            raise;`);
  lines.push(`      end;`);
  lines.push(``);
  return lines;
}

function buildPostquer(tbl: string, columns: ColumnInfo[], idCol: string, shortName: string): string[] {
  const sn = shortName.toLowerCase();
  const lines: string[] = [];
  lines.push(`   BEGIN`);
  lines.push(``);
  lines.push(`      st_${sn}.delete;`);
  lines.push(``);
  lines.push(`      begin`);
  lines.push(`         select ${columns.map(c => `t.${c.column_name.toLowerCase()}`).join(`\n                      , `)}`);
  lines.push(`           into st_${sn}(1)`);
  lines.push(`           from ${tbl} t`);
  lines.push(`          where t.${idCol} = en_${idCol};`);
  lines.push(`      exception`);
  lines.push(`         when no_data_found then`);
  lines.push(`            sn_cd_erro := 1;`);
  lines.push(`            raise ve_erro;`);
  lines.push(`         when others then`);
  lines.push(`            sn_cd_erro := 90001;`);
  lines.push(`            raise;`);
  lines.push(`      end;`);
  lines.push(``);
  return lines;
}

function buildLov(tbl: string, columns: ColumnInfo[], orderCol: string, shortName: string): string[] {
  const sn = shortName.toLowerCase();
  const lines: string[] = [];
  lines.push(`   BEGIN`);
  lines.push(``);
  lines.push(`      st_${sn}.delete;`);
  lines.push(``);
  lines.push(`      begin`);
  lines.push(`         select ${columns.map(c => `t.${c.column_name.toLowerCase()}`).join(`\n                      , `)}`);
  lines.push(`           bulk collect into st_${sn}`);
  lines.push(`           from ${tbl} t`);
  lines.push(`          order by t.${orderCol};`);
  lines.push(`      exception`);
  lines.push(`         when others then`);
  lines.push(`            sn_cd_erro := 90001;`);
  lines.push(`            raise;`);
  lines.push(`      end;`);
  lines.push(``);
  return lines;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function generateTablePackageHandler(args: {
  tableName: string;
  moduleName?: string;
  shortName?: string;
  author?: string;
}) {
  const tableName = args.tableName.toUpperCase();
  const author = args.author || "Desenvolvedor";

  return withConnection(async (connection) => {

    // 1. Fetch columns
    const colResult = await connection.execute<any>(
      `SELECT column_name, data_type, data_length, data_precision, data_scale, nullable, column_id
       FROM user_tab_columns
       WHERE table_name = :tableName
       ORDER BY column_id`,
      { tableName },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!colResult.rows || colResult.rows.length === 0) {
      return {
        content: [{ type: "text", text: `Table '${tableName}' not found or has no columns.` }],
      };
    }

    const columns: ColumnInfo[] = colResult.rows.map((r: any) => ({
      column_name: r.COLUMN_NAME,
      data_type: r.DATA_TYPE,
      data_length: r.DATA_LENGTH,
      data_precision: r.DATA_PRECISION,
      data_scale: r.DATA_SCALE,
      nullable: r.NULLABLE,
      column_id: r.COLUMN_ID,
    }));

    // 2. Fetch Primary Key columns
    const pkResult = await connection.execute<any>(
      `SELECT cc.column_name
       FROM user_constraints c
       JOIN user_cons_columns cc ON c.constraint_name = cc.constraint_name
       WHERE c.table_name = :tableName AND c.constraint_type = 'P'
       ORDER BY cc.position`,
      { tableName },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const pkColumns: string[] = (pkResult.rows || []).map((r: any) => r.COLUMN_NAME.toUpperCase());

    // 3. Find sequence
    const pkCol = pkColumns[0]?.toLowerCase();
    let seqName: string | null = null;
    if (pkCol) {
      const seqResult = await connection.execute<any>(
        `SELECT sequence_name FROM user_sequences
         WHERE sequence_name LIKE :pattern
         ORDER BY sequence_name`,
        { pattern: `${tableName.replace(/_TV$/, "")}_SEQ%` },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      seqName = seqResult.rows?.[0]?.SEQUENCE_NAME?.toLowerCase() || null;
    }

    // 4. Fetch domain constants
    let domains: DomainConstant[] = [];
    try {
      const domResult = await connection.execute<any>(
        `SELECT rv_meaning, rv_low_value, rv_domain,
                substr(rv_domain, instr(rv_domain, '.') + 1) as column_name
         FROM cg_ref_codes
         WHERE rv_domain LIKE :domain
         ORDER BY rv_domain, rv_low_value`,
        { domain: `${tableName}.%` },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      domains = (domResult.rows || []).map((r: any) => ({
        rv_meaning: r.RV_MEANING,
        rv_low_value: r.RV_LOW_VALUE,
        rv_domain: r.RV_DOMAIN,
        column_name: r.COLUMN_NAME,
      }));
    } catch {
      // cg_ref_codes may not be accessible; continue without domains
    }

    // 5. Derive naming
    const shortName = (args.shortName || deriveShortName(tableName)).toUpperCase();
    const module = args.moduleName?.toUpperCase() || "";
    const packageName = module
      ? `PK_${module}_${shortName}`.toUpperCase()
      : `PK_${shortName}`.toUpperCase();

    // 6. Generate spec and body
    const spec = generateSpec(tableName, packageName, shortName, columns, pkColumns, seqName, domains, author);
    const body = generateBody(tableName, packageName, shortName, columns, pkColumns, seqName, author);

    const fileName = packageName.toLowerCase();

    const result = [
      `═══════════════════════════════════════════════════════════════════`,
      `  PACKAGE GERADA: ${packageName}`,
      `  Tabela: ${tableName}  |  Colunas: ${columns.length}  |  PK: ${pkColumns.join(", ") || "N/A"}`,
      `  Sequência: ${seqName || "N/A"}  |  Constantes de domínio: ${domains.length}`,
      `═══════════════════════════════════════════════════════════════════`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━  ${fileName}.pks  ━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      spec,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━  ${fileName}.pkb  ━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      body,
    ].join("\n");

    return {
      content: [{ type: "text", text: result }],
    };
  });
}
