[[_TOC_]]
# Indentação

A indentação deve ser 3 espaços. Não utilizar tab.

# Cabeçalho de procedimentos/funções

Na Package Body devemos sempre incluir um comentário antes de cada procedimento ou função.
Exemplo para Procedimento:

```
/*
_____________________________________________________________________________________________________________________
Desenvolvido por: Felipe M.
Data:             08/11/2022
_____________________________________________________________________________________________________________________
Definição:        Consulta genérica da tabela bem_ativo_imob_efd
_____________________________________________________________________________________________________________________
Parâmetros:       en_bemimobefd_id     ID do Bem do Ativo Imobilizado da EFD
                  ev_cd                Código do Bem do Ativo Imobilizado da EFD
                  ev_descr             Descrição do Bem do Ativo Imobilizado da EFD
                  ev_funcao            Função do Bem do Ativo Imobilizado da EFD
                  en_tp_mercadoria     Tipo de mercadoria (constantes)
                  en_importado         Indicador de Bem importado ou digitado (constantes)
                  en_vida_util         Vida útil do Bem do Ativo Imobilizado da EFD
                  en_unid_id           ID da unidade
                  en_unid_cd           Código da unidade
                  ev_ordem             Critério de ordenação dos registros encontrados
                  st_bemimobefd        Registros encontrados
_____________________________________________________________________________________________________________________
*/
```

Exemplo para Função:

```
/*
_____________________________________________________________________________________________________________________
Desenvolvido por: Clemente
Data:             09/11/2022
_____________________________________________________________________________________________________________________
Definição:        Retorna o ID do Bem do Ativo Imobilizado
_____________________________________________________________________________________________________________________
Parâmetros:       ev_cd                Código do Bem do Ativo Imobilizado da EFD
_____________________________________________________________________________________________________________________
Retorno:          ID do Bem do Ativo Imobilizado
_____________________________________________________________________________________________________________________
*/
```

# Nomenclatura

## Constantes

Declaradas sempre em letras maiúsculas.
Exemplo:

```
TP_BEM                         constant bem_ativo_imob_efd.tp_mercadoria%type := 0;
TP_COMPONENTE                  constant bem_ativo_imob_efd.tp_mercadoria%type := 1;

IMPORT_NAO                     constant bem_ativo_imob_efd.importado%type := 0;
IMPORT_SIM                     constant bem_ativo_imob_efd.importado%type := 1;
```

## Procedimentos

- Devem possuir o prefixo `PKB_`.
- Se tratando de um procedimento aninhado (dentro de outro procedimento), deve possuir o prefixo `PKL_`.
- Regra: O tamanho do nome da package + procedimento não pode ultrapassar 30 caracteres.
- Composição do nome:
PKB - Identificação do procedimento
CON - Identificação da operação:
     CON - Consulta
     INC - Inclusão
     ALT - Alteração
     EXC - Exclusão
     LOC - Lock

BEMIMOBEFD - Short name
     1. Procedimento de tabela CON, INC, ALT, EXC, LOC: sempre utilizar o shortname;
         Ex.: PKB_CON_BEMIMOBEFD , PKB_INC_BEMIMOBEFD, etc..
     2. Procedimentos de Valida: sempre utilizar o shortname 'VALIDA'
         Ex.: PKB_VALIDA
     3. Procedimento de PostQuery: sempre utilizar o shortname 'POSTQUER'
         Ex.: PKB_POSTQUER
     4. Procedimento de Lista de Valores: sempre utilizar LOV
         Ex.: PKB_LOV

## Funções

- Devem possuir o prefixo `FKG_`.
- Se tratando de uma função aninhada (dentro de outra função), deve possuir o prefixo `FKL_`.
- **Restrição de DML**: Funções não devem realizar comandos DML (`INSERT`, `UPDATE`, `DELETE`). Elas devem ser usadas apenas para consultas ou cálculos (side-effect free). Caso precise alterar dados, use um Procedimento (`PKB_`).
- Em geral, não se faz tratamento de erro em funções.

Exemplo:

```
FKG_SEQ
FKG_ID
FKG_SEQ_BEMIMOBEFD
FKG_ATIVOS
```

## Variáveis locais

- Declaradas na sessão declare do procedimento/função
- Prefixos: `vn_` (number e pls_integer), `vv_` (varchar2), `vd_` (data), `vb_` (boolean), `vt_` (vetor table), `vr_` (record), `vc_` (clob).

Exemplo:

```
vn_cd           bem_ativo_imob_efd.cd%type;
vv_descr        bem_ativo_imob_efd.descr%type;
```

## Variáveis privadas (globais da Package)

- Devem ser declaradas no início da Package Body.
- Sempre que possível, adicionar um comentário.
- Prefixos: `gn_` (number e pls_integer); `gv_` (varchar2); `gd_` (data); `gb_` (boolean); `gt_` (vetor table); `gr_` (record);

Exemplo:

```sql
-- Módulo do SPED que rege as regras da tela
gn_modespedtv_id              tipo_param_sped_tv.modespedtv_id%type;
```

## Variáveis para índice

- As variáveis numéricas para controle de índice de vetores devem preferencialmente receber o nome de `vn_indice` e ser do tipo `pls_integer`.
- As variáveis alfanuméricas para controle de índice devem receber o nome `vv_indice` ou `vv_idx`.

### Diga de Best Practices

- **PLS_INTEGER**: Utilize para contadores e índices em vez de `NUMBER`. Ele utiliza aritmética nativa da CPU, sendo muito mais rápido.
- **SIMPLE_INTEGER**: No 19c, se você sabe que o valor nunca será nulo, o `SIMPLE_INTEGER` é ainda mais rápido que o `PLS_INTEGER`.

Exemplo:

```
vn_indice         pls_integer := 0;
vn_indice2        pls_integer := 0;
vn_indice3        pls_integer := 0;

vv_idx            varchar2(30);
```

## Variáveis para percorrer vetores (loop)

- Se tratando de um índice sequencial, usar preferencialmente uma letra, começando pela `i`.
- Se precisar de mais índices, usar `j`, `k`, `l` e assim por diante.

## Parâmetros de procedimento/função

- Para procedimentos é comum utilizarmos parâmetros de entrada, de saída, e de entrada/saída.
- Para funções devemos utilizar apenas parâmetros de entrada.

#### Dica de Best Practices

- **NOCOPY**: Em parâmetros de saída (`out nocopy`) que trafegam Records ou Tables grandes, o `NOCOPY` instrui o compilador a passar o parâmetro por referência (ponteiro), evitando cópias desnecessárias na memória.

### Parâmetros de entrada

- Devem começar com a letra `e`.
- Prefixos: `en_` (number e pls_integer); `ev_` (varchar2); `ed_` (data); `eb_` (boolean); `et_` (vetor table); `er_` (record); `ec_` (clob);

### Parâmetros de saída

- Devem começar com a letra `s`.
- Devem possuir o identificador `nocopy`, indicado a passagem por referência do parâmetro.
- Prefixos: `sn_` (number e pls_integer); `sv_` (varchar2); `sd_` (data); `sb_` (boolean); `st_` (vetor table); `sr_` (record); `sc_` (clob);

### Parâmetros de entada/saída

- Devem começar com as letras `es`.
- Devem possuir o identificador `nocopy`, indicado a passagem por referência do parâmetro.
- Prefixos: `esn_` (number e pls_integer); `esv_` (varchar2); `esd_` (data); `esb_` (boolean); `est_` (vetor table); `esr_` (record); `esc_` (clob);

### Exceptions 
- Devem começar com as letras `ve`.

### Types cursores
- Devem começar com as letras `t_rec_`.

```
// Varivel de entrada de uma função
FUNCTION FKG_ID              ( ev_cd                 in            bem_ativo_imob_efd.cd%type
                             ) return bem_ativo_imob_efd.bemimobefd_id%type;

// Varivel de entrada e saida de um procedimento
PROCEDURE PKB_CON_BEMIMOBEFD ( ev_cd                 in            bem_ativo_imob_efd.cd%type
                             , ev_descr              in            bem_ativo_imob_efd.descr%type
                             , en_tp_mercadoria      in            bem_ativo_imob_efd.tp_mercadoria%type
                             , en_importado          in            bem_ativo_imob_efd.importado%type
                             , est_bemimobefd        in out nocopy t_tab_rec_bemimobefd
                             , sv_sistema               out nocopy varchar2
                             , sv_processo              out nocopy varchar2
                             , sv_msg_erro              out nocopy varchar2
                             , sn_cd_erro               out nocopy number
                             ) ;
```

# Tipos de Dados (Types)

Está disponível para uso apenas os types record, não utilizamos type objects.

## Regras Gerais

1. **Declaração Manual**: O type deve ser declarado campo a campo (ex referenciando `%type`), mesmo que represente todos os campos da tabela.
2. **Uso do `%rowtype`**: 
   Para pacakges de tabela, é permitido o uso do `%rowtype` na declaração de Types/Records, sendo aconselhado a declaração manual como melhor prática. Já para as packages de programas é `PROIBIDO` o uso do `%rowtype` nas declarações de types/records.
3. **Escopo**: Deve ser declarado na *Package Specification* quando o record/vetor for chamado por mais de um procedimento/função ou pelo Forms.
4. **Prefixos**:
   - `t_rec_`: para Records.
   - `t_tab_rec_`: para Associative Arrays e Collections.

## Records

As colunas devem preferencialmente referenciar uma coluna de tabela.

Exemplo:

```sql
type t_rec_bemimobefd          is record ( bemimobefd_id          bem_ativo_imob_efd.bemimobefd_id%type
                                         , tp_mercadoria          bem_ativo_imob_efd.tp_mercadoria%type
                                         , descr                  bem_ativo_imob_efd.descr%type
                                         );
```

## Associative arrays (Tabelas em Memória)

- São tabelas de um tipo escalar, coluna de tabela, linha de tabela, record ou vetor.
- Requerer um indexador, em geral `binary_integer`.

Exemplo:

```sql
type t_tab_rec_ctrl            is table of number(10)                 index by binary_integer;
type t_tab_rec_bemimobefd      is table of t_rec_bemimobefd           index by binary_integer;
```

## Collections (Operações de Conjunto)

- Utilizado para operações de conjuntos sobre vetores.
- Não requer indexador e as variáveis necessitam de inicialização.

Exemplo:

```sql
type t_tab_rec_blocosped_cd  is table of bloco_sped.cd%type;
vt_blocosped_cd     t_tab_rec_blocosped_cd := t_tab_rec_blocosped_cd();
```

## Vetores de controle

- Utilizado para controle de índices e funcionalidades auxiliares.
- Prefixos: `vt_ctrl_` (locais); `gt_ctrl_` (privadas); `et_ctrl_`, `st_ctrl_`, `est_ctrl_` (parâmetros).

## Especificidades por Contexto

### PK de Tabela

Toda PK de tabela deve conter pelo menos um type representando o registro principal, declarado manualmente.

```sql
TYPE t_rec_tppessoatv IS RECORD ( tppessoatv_id  tipo_pessoa_tv.tppessoatv_id%type
                                , cd             tipo_pessoa_tv.cd%type
                                );
```

### PK de Tela (Forms)

Deve-se declarar o type campo a campo para retornar à tela apenas os dados necessários (evitar dados desnecessários na rede).

```sql
type t_rec_efdescrit is record ( efdescrit_id   efd_escrit.efdescrit_id%type
                               , dt_inic        escrit_sped.dt_inic%type
                               );
```

## Exceptions

- Padrão de declaração de variável de exceção, sempre deve iniciar com o prefixo: `ve_`.

No tratamento da exception `Others` sempre deve iniciar em `90000` e ir acrescentando a cada novo tratamento. Esta contagem se inicia e termina em cada procedure, ocorrendo a repetição dos números em procedures separadas. 

Todas as exceptions tratadas ao longo do código, deve ser cadastrada no programa `SOFF9031` do modulo de `PCP`.

Ao final de cada procedure deve ter um tratamento considerando todas as exception internas da procedure, e sempre chamando a `pk` de busca de mensagens previamente cadastradas. Conforme exemplo abaixo.


Exemplo:

```
ve_erro              exception;
ve_erro_pk           exception;
```

Os tratamentos de Exception definidas pelo programador devem ser declarados antes do Others.

exemplo:

```
Tratamento de Erro para Comandos DML
begin
    begin   
       select unid_id 
       into vn_unid_id
       from unid
       where cd = v_cd;
    exception
        when no_data_found then
            sn_cd_erro := 1;
            raise ve_erro;
        when others then
            sn_cd_erro := 90001;
            raise;
    end; 
exception
    when ve_erro then
        sv_sistema  := 'COR';
        sv_processo := 'PK_UNID.PKB_CON_UNID';
        sn_cd_erro  := nvl(sn_cd_erro,90000);
        pk_soft.pkb_busca_msg_erro  ( en_cd       => sn_cd_erro
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
    when others then
        sv_sistema  := 'COR';
        sv_processo := 'PK_UNID.PKB_CON_UNID';
        sn_cd_erro  := nvl(sn_cd_erro,90000);
        pk_soft.pkb_busca_msg_erro  ( en_cd       => sqlcode
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
end;

Tratamento de Erro para Chamadas de Procedimentos
begin
    pk_unid.pkb_con_unid ( en_cd       => 999
                         , est_unid    => vt_unid
                         , sv_sistema  => sv_sistema
                         , sv_processo => sv_processo
                         , sv_msg_erro => sv_msg_erro
                         , sn_cd_erro  => sn_cd_erro
                         );
    if sn_cd_erro > 0 then
        raise ve_erro;
    end if;
exception
    when ve_erro then
        -- Deve sempre retornar null para não reescrever o erro do procedimento chamado
        null;
    when others then
        sv_sistema  := 'COR';
        sv_processo := 'PK_COR.PKB_CON_UNID';
        sn_cd_erro  := nvl(sn_cd_erro,90000);
        pk_soft.pkb_busca_msg_erro  ( en_cd       => sqlcode
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
end;
```

As exceções também podem ser tratadas com associação de erro (PRAGMA EXCEPTION INIT)

Exemplo:

```
DECLARE
  -- 1. Declare os nomes das suas exceções personalizadas
  ve_no_data_found EXCEPTION;

  -- 2. Associe os nomes aos códigos de erro Oracle (PRAGMA)
  PRAGMA EXCEPTION_INIT(ve_no_data_found, -1403); 

  v_nome VARCHAR2(100);
BEGIN
  -- Exemplo de SELECT que pode gerar NO_DATA_FOUND
  SELECT nome INTO v_nome FROM clientes WHERE id = 999;

EXCEPTION
  -- 3. Trate as exceções pelos nomes que você definiu
  WHEN ve_no_data_found THEN
    DBMS_OUTPUT.PUT_LINE('Erro: Nenhum dado foi encontrado para esta consulta.');

  WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE('Erro inesperado: ' || SQLERRM);
END;

DECLARE
  -- 1. Declare os nomes das suas exceções personalizadas
  ve_dup_val_on_index EXCEPTION;

  -- 2. Associe os nomes aos códigos de erro Oracle (PRAGMA)
  PRAGMA EXCEPTION_INIT(ve_dup_val_on_index, -0001); 

BEGIN
  -- Exemplo de INSERT que pode gerar DUP_VAL_ON_INDEX
  INSERT INTO clientes (id, nome) VALUES (1, 'Teste');
  
EXCEPTION
  -- 3. Trate as exceções pelos nomes que você definiu
  WHEN ve_dup_val_on_index THEN
    DBMS_OUTPUT.PUT_LINE('Erro: Tentativa de inserir um ID que já existe (Unique Key).');

  WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE('Erro inesperado: ' || SQLERRM);
END;
```

## Cursores fracos (SYS_REFCURSOR)

- Priorizar a declaração na sessão DECLARE no procedimento/função.
- Prefixo: `cur_`.

Exemplo:

```
cur_1      sys_refcursor;
cur_2      sys_refcursor;
```

Obs.: O uso de Cursores fracos traz economia de memória, já que o mesmo é um ponteiro para o cursor original, não sendo recarregado a cada passagem de parâmetro.

# PK de tabela

## Nomenclatura

### Arquivo

- Package Specification: pk_[módulo]_[Shortname da tabela].pks
  Exemplo: pk_efd_bemimobefd.pks
- Package Body: pk_[módulo]_[Shortname da tabela].pkb
  Exemplo: pk_efd_bemimobefd.pkb

## Package Specification

Exemplo: [pk_efd_bemimobefd.pks](/.attachments/pk_efd_bemimobefd.pks-f077e3a1-42b6-48d0-a42c-bfa960d47252.txt)
A declaração deve seguir a seguinte ordem, sempre que possível:

- Constantes públicas
- Types
- Functions
- Procedure

## Package Body

Exemplo: [pk_efd_bemimobefd.pkb](/.attachments/pk_efd_bemimobefd.pkb-22de7117-093d-447f-b2aa-9662cb78fd53.txt)
A declaração deve seguir a seguinte ordem, sempre que possível:

- User Exceptions
- Constantes privadas
- Types privados
- Variáveis privadas (chamadas de globals)
- Functions
- Procedures

## Constantes de domínio

É comum em PKs de tabela a utilização de constantes para representar valores dos domínios dos campos de tabelas.
Para verificar o nome das constantes a serem criadas, deve se fazer a verificação na tabela `cg_ref_codes`.

```sql
select r.* 
  from cg_ref_codes r
 where r.rv_domain like 'BEM_ATIVO_IMOB_EFD.%';
```

Também pode ser utilizado a função 'pk_aurora.fkg_dominio' para retornar o valor de um determinado dominio.

```sql
declare
  vv_dominio varchar2(100);
begin
  vv_dominio := pk_aurora.fkg_dominio ( 'BEM_ATIVO_IMOB_EFD.TP_MERCADORIA',0 );
  dbms_output.put_line(vv_dominio);
end;
```

As constantes de domínio devem ser públicas, ou seja, devem ser criadas na Package Specification.
Os nomes das constantes são obtidos a partir do campo `RV_MEANING` e seu valor do campo `RV_LOW_VALUE`.

Exemplo:  

```
TP_BEM                  constant bem_ativo_imob_efd.tp_mercadoria%type := 0;
TP_COMPONENTE           constant bem_ativo_imob_efd.tp_mercadoria%type := 1;
```

A referência à constantes no código fonte deve em letras maiúsculas.
Exemplo:

```sql
select bai.*
  bulk collect into vt_bemimobefd
  from bem_ativo_imob_efd bai
where bai.tp_mercadoria = pk_efd_bemimobefd.TP_BEM;
```

## Funções/Procedimentos padrão

Toda package de tabela deve conter as seguintes funções e procedimentos, desde sua concepção.

### FKG_SEQ

- Retorna a próxima sequência da tabela vinculada.
  
### PKB_VAL

- Validação dos dados da tabela.
- Deve conter todas as validações necessárias para atender as regras de negocio. Podendo haver variações entre os procedimentos de INC, ALT e EXC.
- Deve ser chamada sempre que seja necessário validar os dados da tabela.
  
### PKB_CON

- Consulta genérica na tabela.
- Retorna quantos registros forem encontrados na consulta conforme os paramentos de entrada. (vetor de saída com indexação binary_integer).
  
### PKB_INC

- Inclusão de registros.
- Chama a PKB_VAL e é obrigatório o tratamento das exceptions DUP_VAL_ON_INDEX e OTHERS.
  
### PKB_ALT

- Alteração de registros.
- Chama a PKB_VAL e é obrigatório o tratamento das exceptions DUP_VAL_ON_INDEX e OTHERS.

### PKB_EXC

- Exclusão de registros.
- Chama a PKB_VAL se for o caso, e é obrigatório o tratamento da exception OTHERS.
  
### PKB_VALIDA

- *Dependendo da tabela, esse procedimento não se aplica. Normalmente utilizada em tabelas de domínio (Tabelas vermelhas) com código e descrição.*
- Recebe como parâmetro os campos que representam a Unique Key(UK) da tabela.
- Deve retornar sempre um único registro (vetor de saída na posição 1).
- É obrigatório o tratamento de erro quando não encontrar o registro.

  
### PKB_POSTQUER

- Recebe como parâmetro o ID da tabela.
- Deve retornar sempre um único registro.
- É obrigatório o tratamento de erro quando não encontrar o registro.

### PKB_LOV

- *Dependendo da tabela, esse procedimento não se aplica. Normalmente utilizada em tabelas de domínio (Tabelas vermelhas)com código e descrição.*
- Consulta genérica na tabela, ordenada por padrão (não obrigatório) pelo campo descrição .
- Retorna quantos registros forem encontrados (vetor de saída com indexação binary_integer).

# PK de tela

Uma PK de tela tem um único objetivo. Servir uma tela (Forms). Ela deve conter os recursos que serão usados pela tela. São aceitas regras de negócio que são específicas da tela. As regras gerais devem ficar nos procedimentos da PK de tabela.
Uma tela pode possuir uma infinidade de objetivos. Haverão telas que servem apenas para consulta de dados, haverão aquelas que servem apenas para chamar um procedimento, e haverão aquelas com muitos recursos: Abas, blocos, janelas, etc.

## Nomenclatura

### Arquivos

- Package Specification: pk_[módulo]F[Código da tela].pks
  Exemplo: pk_efdf0107.pks
- Package Body: pk_[módulo]F[Código da tela].pkb
  Exemplo: pk_efdf0107.pkb

## Package Specification

Exemplo: [pk_efdf0107.pks](/.attachments/pk_efdf0107_pks-a980fe8c-d238-48eb-9d9b-65e2a7b435bf.txt)
A declaração deve seguir a seguinte ordem, sempre que possível:

- Constantes públicas
- Types
- Functions específicas para incremento de sequences (Utilizar a FKG_SEQ da PK de tabela)
- Demais Functions
- Procedures
  - Procedure dos blocos na seguinte ordem: Consulta, Inclusão, Alteração, Exclusão e Lock
  - Procedures de rotinas de processamento
  - Procedures de LOV
  - PKB_VALIDA
  - PKB_POSTQUER

## Package Body

Exemplo: [pk_efdf0107.pkb](/.attachments/pk_efdf0107_pkb-6e583c63-9292-49f2-8600-db9dbf84301c.txt)
A declaração deve seguir a seguinte ordem, sempre que possível:

- User Exceptions
- Constantes privadas
- Types privados
- Variáveis privadas (chamadas de globals)
- Functions
- Procedures

## Funções/Procedimentos padrão

Quando for o caso, a PK de tela deverá conter as seguintes Funções/Procedimentos padrão.

### FKG_SEQ [Shortname da tabela]

- Retorna a próxima sequência da tabela vinculada.
- Chamar a Função FKG_SEQ da PK de tabela.

### PKB_VALIDA

Nesta Procedure deve conter as validações necessárias para a tela. Validando os campos que necessitam de informações adicionais.

Regra: Não deve ser utilizado select ou qualquer comando DML na PKB_VALIDA, sempre criar procedimentos ou funções para retornar à informação.

Exemplo:
Quando a tela possui os campos de unidade, onde o usuário deve informar o código da unidade e devemos mostrar os dados de nome e ID da unidade.
Então deve ser chamada a pkb_valida da tabela de unidades. `pk_cor_unid.pkb_valida`

### PKB_POSTQUER

Nesta procedure deve retornar as informações complementares de um determinado ID.
Regra: Não deve ser utilizado select ou qualquer comando DML na PKB_VALIDA, sempre criar procedimentos ou funções para retornar à informação.

Exemplo:
Na consulta principal da tela é retornado apenas o ID da unidade, mas para uma melhor visualização deve ser apresentado o nome e o código.  
Então deve ser chamada a pkb_postquer da tabela de unidades. `pk_cor_unid.pkb_postquer`

### PK_SFPADRAO
Este procedimento tem integração com o forms, o que nos possibilita que possamos `obter` a informação de determinado campo no forms:
* **IMPORTANTE**: esta package só pode ser utilizada nas procedures de valida `PKB_VALIDA` e postquer `PKB_POSTQUER` da package do forms, sendo **EXPRESSAMENTE** proibida a utilização dela em outras procedures.

Variáveis disponíveis para uso:
* `pk_sfpadrao.vv_bloco` --> Possui a informação do bloco atual que o usuário está selecionado.
* `pk_sfpadrao.vv_campo` --> Possui a informação do campo atual que o usuário está selecionado.
* `pk_sfpadrao.vt_array('bloco.campo')` --> Possui o valor do campo.
* `pk_sfpadrao.vt_array_r('bloco.campo')` --> Retorna o valor para o campo.

Antes de iniciar os procedimentos de validação, deve ser limpo as variáveis de erro do forms. 

      pk_sfpadrao.vt_array_r('bl_erro_ct.sistema')    := null;
      pk_sfpadrao.vt_array_r('bl_erro_ct.processo')   := null;
      pk_sfpadrao.vt_array_r('bl_erro_ct.msg_erro')   := null;
      pk_sfpadrao.vt_array_r('bl_erro_ct.cd_erro')    := null;

Exemplo de utilização das variáveis: 

    -- Verificnado se o bloco é o que precisa ser tratado.
    if pk_sfpadrao.vv_bloco = 'bl_param_ct' then
        -- Verificando se é o campo que precisa ser tratado.
       if pk_sfpadrao.vv_campo = 'v_cd_unid' then
          -- Verificando se o campo possui valor 
          if pk_sfpadrao.vt_array('bl_param_ct.v_d_unid') is not null then
             -- chamando a pk da unidade para fazer validação do campo unid
             vt_tab_unid.delete;
             pk_cap.pkb_con_unid( en_cd_unid   => pk_sfpadrao.vt_array('bl_param_ct.v_cd_unid')
                                , en_unid_id   => null
                                , ev_tp_unid   => 'AVES_ABATE'
                                , est_tab_unid => vt_tab_unid
                                , sv_sistema   => pk_sfpadrao.vt_array_r('bl_erro_ct.sistema') -- Retornando para o campo no forms
                                , sv_processo  => pk_sfpadrao.vt_array_r('bl_erro_ct.processo') -- Retornando para o campo no forms
                                , sv_msg_erro  => pk_sfpadrao.vt_array_r('bl_erro_ct.msg_erro') -- Retornando para o campo no forms
                                , sn_cd_erro   => pk_sfpadrao.vt_array_r('bl_erro_ct.cd_erro') -- Retornando para o campo no forms
                                );
                  -- verificando se a Pk retorno algum tipo de erro    
                  if pk_sfpadrao.vt_array_r('bl_erro_ct.cd_erro') is not null then
                    --Caso ocorrer algum erro na execução da Package deve-se limpar os campos no forms evitando Lixo e possíveis erros decorrentes disso.
                     pk_sfpadrao.vt_array_r('bl_param_ct.v_unid_id') := null;
                     pk_sfpadrao.vt_array_r('bl_param_ct.v_unid_ids') := null;
                     pk_sfpadrao.vt_array_r('bl_param_ct.v_nome_unid') := null;
                     -- Chamando exception de erro
                     raise ve_erro_pk;
                  end if;
                  
                  -- Verificando se o vetor de retorno tem informação
                  if nvl(vt_tab_unid.count,0) = 0 then
                     pk_sfpadrao.vt_array_r('bl_param_ct.v_unid_id') := null;
                     pk_sfpadrao.vt_array_r('bl_param_ct.v_unid_ids') := null;
                     pk_sfpadrao.vt_array_r('bl_param_ct.v_nome_unid') := null;
                     pk_sfpadrao.vv_msg := 'Unidade não cadastrada ou não é do tipo Abate Aves.';
                     raise ve_erro;
                  end if;

                  -- Caso estiver tudo ok, retorna os valores para os campos do forms 
                  pk_sfpadrao.vt_array_r('bl_param_ct.v_unid_id') := vt_tab_unid(1).unid_id;
                  pk_sfpadrao.vt_array_r('bl_param_ct.v_nome_unid') := vt_tab_unid(1).nome;
          end if;
       end if;
    end if;

### Procedure dos blocos

#### PKB_CON_[Shortname da tabela]

- Consulta de registros do bloco de dados correspondente.
- Sempre que for possível, chamar a PKB_CON da PK da tabela.
Aqui podem ser passados todos os parâmetros necessários para a consulta.

#### PKB_INC_[Shortname da tabela]

- Inclusão de registros do bloco de dados correspondente.
- Sempre que for possível, chamar a PKB_INC da PK da tabela.

#### PKB_ALT_[Shortname da tabela]

- Alteração de registros do bloco de dados correspondente.
- Sempre que for possível, chamar a PKB_ALT da PK da tabela.

#### PKB_EXC_[Shortname da tabela]

- Exclusão de registros do bloco de dados correspondente.
- Sempre que for possível, chamar a PKB_EXC da PK da tabela.

#### PKB_LOC_[Shortname da tabela]

- Realiza o "lock" dos registros que estão sendo alterados ou excluídos.
- Lógica desenvolvida na própria procedure, pois não há correspondência na PK da tabela.
  

> **Obs:** A procedure de lock (`PKB_LOC`) não pode ser encapsulada (não pode chamar outra procedure dentro dela). O *select* de lock da tabela deve estar puro dentro da mesma, caso contrário o erro não irá ser exibido no Forms e o lock ocorrerá de forma incorreta no banco.

Exemplo:

```
PKB_CON_APURAIPI
PKB_INC_APURAIPI
PKB_ALT_APURAIPI
PKB_EXC_APURAIPI
PKB_LOC_APURAIPI
```

# Dicas e boas práticas

## Select

Regra: Nunca utilizar `select *`, sempre deve ser especificado as colunas no `select` mesmo que ele retorne todas as colunas da tabela.

## Uso da nvl() com count()

A função `count()`, sempre irá retornar um valor, sendo desnecessário o tratamento de *null* com a função `nvl()`, sendo assim, em casos onde existe:

```plsql
if nvl(st_nome.count, 0) = 0 then
   -- Bloco Código;
end if;
```

pode ser assim:

```plsql
if st_nome.count > 0 then
   -- Bloco Código;
end if;
```

## Uso da coalesce() vs nvl()

As funções `nvl` e `coalesce` são utilizadas para lidar com valores nulos, mas apresentam algumas diferenças importantes em termos de comportamento e flexibilidade.

### Número de argumentos

NVL: Aceita apenas dois argumentos.
coalesce : Aceita múltiplos argumentos.

```sql
nvl(expr1, expr2)
```

Retorna `expr2` se `expr1` for `null`; caso contrário, retorna `expr1`.

COALESCE: Aceita dois ou mais argumentos.

```sql
coalesce(expr1, expr2, ..., exprN)
```

Retorna o primeiro valor não nulo da lista de argumentos.

### Tipos de dados

NVL: Os dois argumentos devem ser do mesmo tipo de dados ou compatíveis implicitamente (senão ocorre erro).

```sql
nvl('texto', 123)  -- ERRO: tipos incompatíveis
```

COALESCE: Realiza uma conversão implícita mais flexível, desde que os tipos sejam compatíveis de forma coerente.

```sql
coalesce('texto', to_char(123))  -- Válido
```

### Avaliação de expressões

NVL: Avalia ambos os argumentos, mesmo que o primeiro não seja nulo.
**Importante:** Isso pode causar efeitos colaterais se o segundo argumento for uma função com impacto.

COALESCE: Avalia os argumentos da esquerda para a direita, parando assim que encontra o primeiro valor não nulo. Pode ser mais eficiente ou evitar erros em expressões complexas.

### Compatibilidade com o padrão SQL

NVL: É específica do Oracle, ou seja, não faz parte do padrão SQL ANSI.

COALESCE: É parte do padrão SQL ANSI, sendo portável para outros bancos de dados como PostgreSQL, SQL Server, etc.

### Exemplos práticos

```plsql
Resultado: 'default'
select nvl(null, 'default') from dual;

-- Resultado: 'valor'
select coalesce(null, null, 'valor', 'outro') from dual;
```

## DBMS
Regra: Proibido deixar código `DMBS_OUTPUT` no código em produção

## Código comentado
Regra: Extremamente proibido enviar código comentado ('sujeira') para produção.


## Bulk Collect vs. Cursor

Para consultas pequenas, abaixo de 500 registros, ou muito grandes, acima de 50.000 linhas, deve-se utilizar o `cursor` para fazer select.  
Já para as consultas que ficarem entre 500 e 50.000 linhas devem ser utilizados `bulk collect`.
* **Dica..:** Como uma boa prática, quando se está trabalhando com volume muito grande de dados, deve-se utilizar o `LIMIT`.

