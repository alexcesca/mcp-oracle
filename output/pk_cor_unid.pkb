PACKAGE BODY PK_COR_UNID IS
   ---

   -- User Exceptions
   ve_erro              exception;
   ve_erro_pk           exception;

   -- -------------------------------------------------------------------------------------
   --  FUNÇÕES
   -- -------------------------------------------------------------------------------------

   /*
   _____________________________________________________________________________________________________________________
   Desenvolvido por: Desenvolvedor
   Data:             14/04/2026
   _____________________________________________________________________________________________________________________
   Definição:        Retorna a próxima sequência da tabela unid
   _____________________________________________________________________________________________________________________
   Retorno:          Próximo valor da sequence unid_seq
   _____________________________________________________________________________________________________________________
   */
   FUNCTION FKG_SEQ RETURN unid.unid_id%type IS

      vn_unid_id             unid.unid_id%type;

   BEGIN

      select unid_seq.nextval
        into vn_unid_id
        from dual;

      return (vn_unid_id);

   EXCEPTION
      when others then
         raise_application_error(-20001, 'Erro em PK_COR_UNID.FKG_SEQ - ' || sqlerrm);
   END FKG_SEQ;

   -- -------------------------------------------------------------------------------------
   --  PROCEDURES
   -- -------------------------------------------------------------------------------------

   /*
   _____________________________________________________________________________________________________________________
   Desenvolvido por: Desenvolvedor
   Data:             14/04/2026
   _____________________________________________________________________________________________________________________
   Definição:        Validação dos dados da tabela unid
   _____________________________________________________________________________________________________________________
   Parâmetros:       en_unid_id               ID do registro
                     sv_sistema               Sistema
                     sv_processo              Processo
                     sv_msg_erro              Mensagem de erro
                     sn_cd_erro               Código de erro
   _____________________________________________________________________________________________________________________
   */
   PROCEDURE PKB_VAL_UNID ( en_unid_id              in            unid.unid_id%type
                           , sv_sistema               out nocopy varchar2
                           , sv_processo              out nocopy varchar2
                           , sv_msg_erro              out nocopy varchar2
                           , sn_cd_erro               out nocopy number
                           ) IS

   BEGIN

      -- TODO: implementar validações de negócio
      null;

   EXCEPTION
      when ve_erro then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_VAL_UNID';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sn_cd_erro
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
      when others then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_VAL_UNID';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sqlcode
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
   END PKB_VAL_UNID;

   /*
   _____________________________________________________________________________________________________________________
   Desenvolvido por: Desenvolvedor
   Data:             14/04/2026
   _____________________________________________________________________________________________________________________
   Definição:        Consulta genérica da tabela unid
   _____________________________________________________________________________________________________________________
   Parâmetros:       en_cd                    Filtro por código
                     ev_nome                  Filtro por nome
                     en_sit                   Filtro por situação (PK_COR_UNID.ATIVO / PK_COR_UNID.INATIVO)
                     est_unid                 Registros encontrados
                     sv_sistema               Sistema
                     sv_processo              Processo
                     sv_msg_erro              Mensagem de erro
                     sn_cd_erro               Código de erro
   _____________________________________________________________________________________________________________________
   */
   PROCEDURE PKB_CON_UNID ( en_cd                   in            unid.cd%type
                           , ev_nome                 in            unid.nome%type
                           , en_sit                  in            unid.sit%type
                           , est_unid                in out nocopy t_tab_rec_unid
                           , sv_sistema               out nocopy varchar2
                           , sv_processo              out nocopy varchar2
                           , sv_msg_erro              out nocopy varchar2
                           , sn_cd_erro               out nocopy number
                           ) IS

      cur_1      sys_refcursor;
      vn_indice  pls_integer := 0;
      vv_sql     varchar2(32767);

   BEGIN

      est_unid.delete;

      vv_sql := 'select t.unid_id
                      , t.cd
                      , t.nro_ult_recibo
                      , t.nome
                      , t.empr_id
                      , t.banco_id_pagto
                      , t.banco_id_cobra
                      , t.tpcobrantv_id
                      , t.tppagtotv_id
                      , t.ar_unid_id_princ
                      , t.abrev
                      , t.sit
                   from unid t
                  where 1 = 1';

      -- Código
      if en_cd is not null then
         vv_sql := vv_sql || ' and t.cd = :en_cd';
      else
         vv_sql := vv_sql || ' and 1 = :en_cd';
      end if;

      -- Nome
      if ev_nome is not null then
         vv_sql := vv_sql || ' and t.nome like :ev_nome';
      else
         vv_sql := vv_sql || ' and ''A'' = :ev_nome';
      end if;

      -- Situação
      if en_sit is not null then
         vv_sql := vv_sql || ' and t.sit = :en_sit';
      else
         vv_sql := vv_sql || ' and 1 = :en_sit';
      end if;

      vv_sql := vv_sql || ' order by t.cd';

      begin
         open cur_1 for vv_sql
                  using nvl(en_cd, 1)
                      , nvl(ev_nome, 'A')
                      , nvl(en_sit, 1);
      exception
         when others then
            sn_cd_erro := 90001;
            raise;
      end;

      loop
         vn_indice := vn_indice + 1;
         fetch cur_1 into est_unid(vn_indice);
         exit when cur_1%notfound;
      end loop;

      close cur_1;

   EXCEPTION
      when ve_erro then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_CON_UNID';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sn_cd_erro
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
      when others then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_CON_UNID';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sqlcode
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
   END PKB_CON_UNID;

   /*
   _____________________________________________________________________________________________________________________
   Desenvolvido por: Desenvolvedor
   Data:             14/04/2026
   _____________________________________________________________________________________________________________________
   Definição:        Inclusão de registros na tabela unid
   _____________________________________________________________________________________________________________________
   Parâmetros:       est_unid                 Registros a inserir (posição 1)
                     sv_sistema               Sistema
                     sv_processo              Processo
                     sv_msg_erro              Mensagem de erro
                     sn_cd_erro               Código de erro
   _____________________________________________________________________________________________________________________
   */
   PROCEDURE PKB_INC_UNID ( est_unid                in out nocopy t_tab_rec_unid
                           , sv_sistema               out nocopy varchar2
                           , sv_processo              out nocopy varchar2
                           , sv_msg_erro              out nocopy varchar2
                           , sn_cd_erro               out nocopy number
                           ) IS

   BEGIN

      -- Validação antes da inclusão
      PKB_VAL_UNID ( en_unid_id  => est_unid(1).unid_id
                   , sv_sistema  => sv_sistema
                   , sv_processo => sv_processo
                   , sv_msg_erro => sv_msg_erro
                   , sn_cd_erro  => sn_cd_erro
                   );
      if sn_cd_erro > 0 then
         raise ve_erro_pk;
      end if;

      est_unid(1).unid_id := FKG_SEQ;

      begin
         insert into unid
                  ( unid_id
                  , cd
                  , nro_ult_recibo
                  , nome
                  , empr_id
                  , banco_id_pagto
                  , banco_id_cobra
                  , tpcobrantv_id
                  , tppagtotv_id
                  , ar_unid_id_princ
                  , abrev
                  , sit
                  ) values
                  ( est_unid(1).unid_id
                  , est_unid(1).cd
                  , est_unid(1).nro_ult_recibo
                  , est_unid(1).nome
                  , est_unid(1).empr_id
                  , est_unid(1).banco_id_pagto
                  , est_unid(1).banco_id_cobra
                  , est_unid(1).tpcobrantv_id
                  , est_unid(1).tppagtotv_id
                  , est_unid(1).ar_unid_id_princ
                  , est_unid(1).abrev
                  , est_unid(1).sit
                  );
      exception
         when dup_val_on_index then
            sn_cd_erro := 2;
            raise ve_erro;
         when others then
            sn_cd_erro := 90001;
            raise;
      end;

   EXCEPTION
      when ve_erro_pk then
         null; -- Preserva a mensagem do procedimento chamado
      when ve_erro then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_INC_UNID';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sn_cd_erro
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
      when others then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_INC_UNID';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sqlcode
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
   END PKB_INC_UNID;

   /*
   _____________________________________________________________________________________________________________________
   Desenvolvido por: Desenvolvedor
   Data:             14/04/2026
   _____________________________________________________________________________________________________________________
   Definição:        Alteração de registros na tabela unid
   _____________________________________________________________________________________________________________________
   Parâmetros:       est_unid                 Registros a alterar (posição 1)
                     sv_sistema               Sistema
                     sv_processo              Processo
                     sv_msg_erro              Mensagem de erro
                     sn_cd_erro               Código de erro
   _____________________________________________________________________________________________________________________
   */
   PROCEDURE PKB_ALT_UNID ( est_unid                in out nocopy t_tab_rec_unid
                           , sv_sistema               out nocopy varchar2
                           , sv_processo              out nocopy varchar2
                           , sv_msg_erro              out nocopy varchar2
                           , sn_cd_erro               out nocopy number
                           ) IS

   BEGIN

      -- Validação antes da alteração
      PKB_VAL_UNID ( en_unid_id  => est_unid(1).unid_id
                   , sv_sistema  => sv_sistema
                   , sv_processo => sv_processo
                   , sv_msg_erro => sv_msg_erro
                   , sn_cd_erro  => sn_cd_erro
                   );
      if sn_cd_erro > 0 then
         raise ve_erro_pk;
      end if;

      begin
         update unid
            set cd               = est_unid(1).cd
              , nro_ult_recibo   = est_unid(1).nro_ult_recibo
              , nome             = est_unid(1).nome
              , empr_id          = est_unid(1).empr_id
              , banco_id_pagto   = est_unid(1).banco_id_pagto
              , banco_id_cobra   = est_unid(1).banco_id_cobra
              , tpcobrantv_id    = est_unid(1).tpcobrantv_id
              , tppagtotv_id     = est_unid(1).tppagtotv_id
              , ar_unid_id_princ = est_unid(1).ar_unid_id_princ
              , abrev            = est_unid(1).abrev
              , sit              = est_unid(1).sit
          where unid_id = est_unid(1).unid_id;
      exception
         when dup_val_on_index then
            sn_cd_erro := 3;
            raise ve_erro;
         when others then
            sn_cd_erro := 90002;
            raise;
      end;

   EXCEPTION
      when ve_erro_pk then
         null; -- Preserva a mensagem do procedimento chamado
      when ve_erro then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_ALT_UNID';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sn_cd_erro
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
      when others then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_ALT_UNID';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sqlcode
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
   END PKB_ALT_UNID;

   /*
   _____________________________________________________________________________________________________________________
   Desenvolvido por: Desenvolvedor
   Data:             14/04/2026
   _____________________________________________________________________________________________________________________
   Definição:        Exclusão de registros da tabela unid
   _____________________________________________________________________________________________________________________
   Parâmetros:       est_unid                 Registro a excluir (posição 1, deve conter unid_id)
                     sv_sistema               Sistema
                     sv_processo              Processo
                     sv_msg_erro              Mensagem de erro
                     sn_cd_erro               Código de erro
   _____________________________________________________________________________________________________________________
   */
   PROCEDURE PKB_EXC_UNID ( est_unid                in out nocopy t_tab_rec_unid
                           , sv_sistema               out nocopy varchar2
                           , sv_processo              out nocopy varchar2
                           , sv_msg_erro              out nocopy varchar2
                           , sn_cd_erro               out nocopy number
                           ) IS

   BEGIN

      begin
         delete from unid
          where unid_id = est_unid(1).unid_id;
      exception
         when others then
            sn_cd_erro := 90001;
            raise;
      end;

   EXCEPTION
      when ve_erro then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_EXC_UNID';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sn_cd_erro
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
      when others then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_EXC_UNID';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sqlcode
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
   END PKB_EXC_UNID;

   /*
   _____________________________________________________________________________________________________________________
   Desenvolvido por: Desenvolvedor
   Data:             14/04/2026
   _____________________________________________________________________________________________________________________
   Definição:        Lock de registros da tabela unid (não pode ser encapsulada)
   _____________________________________________________________________________________________________________________
   Parâmetros:       est_unid                 Registro a bloquear (posição 1)
                     sv_sistema               Sistema
                     sv_processo              Processo
                     sv_msg_erro              Mensagem de erro
                     sn_cd_erro               Código de erro
   _____________________________________________________________________________________________________________________
   */
   PROCEDURE PKB_LOC_UNID ( est_unid                in out nocopy t_tab_rec_unid
                           , sv_sistema               out nocopy varchar2
                           , sv_processo              out nocopy varchar2
                           , sv_msg_erro              out nocopy varchar2
                           , sn_cd_erro               out nocopy number
                           ) IS

   BEGIN

      begin
         select unid_id
           into est_unid(1).unid_id
           from unid
          where unid_id = est_unid(1).unid_id
            for update nowait;
      exception
         when others then
            sn_cd_erro := 90001;
            raise;
      end;

   EXCEPTION
      when ve_erro then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_LOC_UNID';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sn_cd_erro
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
      when others then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_LOC_UNID';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sqlcode
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
   END PKB_LOC_UNID;

   /*
   _____________________________________________________________________________________________________________________
   Desenvolvido por: Desenvolvedor
   Data:             14/04/2026
   _____________________________________________________________________________________________________________________
   Definição:        Busca por Unique Key (cd) - retorna 1 registro na posição 1
   _____________________________________________________________________________________________________________________
   Parâmetros:       en_cd                    Código da unidade (UK)
                     st_unid                  Registro encontrado (posição 1)
                     sv_sistema               Sistema
                     sv_processo              Processo
                     sv_msg_erro              Mensagem de erro
                     sn_cd_erro               Código de erro
   _____________________________________________________________________________________________________________________
   */
   PROCEDURE PKB_VALIDA ( en_cd                   in            unid.cd%type
                        , st_unid                    out nocopy t_tab_rec_unid
                        , sv_sistema               out nocopy varchar2
                        , sv_processo              out nocopy varchar2
                        , sv_msg_erro              out nocopy varchar2
                        , sn_cd_erro               out nocopy number
                        ) IS

   BEGIN

      st_unid.delete;

      begin
         select t.unid_id
              , t.cd
              , t.nro_ult_recibo
              , t.nome
              , t.empr_id
              , t.banco_id_pagto
              , t.banco_id_cobra
              , t.tpcobrantv_id
              , t.tppagtotv_id
              , t.ar_unid_id_princ
              , t.abrev
              , t.sit
           into st_unid(1)
           from unid t
          where t.cd = en_cd
            and rownum = 1;
      exception
         when no_data_found then
            sn_cd_erro := 1;
            raise ve_erro;
         when others then
            sn_cd_erro := 90001;
            raise;
      end;

   EXCEPTION
      when ve_erro then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_VALIDA';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sn_cd_erro
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
      when others then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_VALIDA';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sqlcode
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
   END PKB_VALIDA;

   /*
   _____________________________________________________________________________________________________________________
   Desenvolvido por: Desenvolvedor
   Data:             14/04/2026
   _____________________________________________________________________________________________________________________
   Definição:        Busca por ID - retorna 1 registro com todos os dados
   _____________________________________________________________________________________________________________________
   Parâmetros:       en_unid_id               ID da unidade
                     st_unid                  Registro encontrado (posição 1)
                     sv_sistema               Sistema
                     sv_processo              Processo
                     sv_msg_erro              Mensagem de erro
                     sn_cd_erro               Código de erro
   _____________________________________________________________________________________________________________________
   */
   PROCEDURE PKB_POSTQUER ( en_unid_id              in            unid.unid_id%type
                           , st_unid                    out nocopy t_tab_rec_unid
                           , sv_sistema               out nocopy varchar2
                           , sv_processo              out nocopy varchar2
                           , sv_msg_erro              out nocopy varchar2
                           , sn_cd_erro               out nocopy number
                           ) IS

   BEGIN

      st_unid.delete;

      begin
         select t.unid_id
              , t.cd
              , t.nro_ult_recibo
              , t.nome
              , t.empr_id
              , t.banco_id_pagto
              , t.banco_id_cobra
              , t.tpcobrantv_id
              , t.tppagtotv_id
              , t.ar_unid_id_princ
              , t.abrev
              , t.sit
           into st_unid(1)
           from unid t
          where t.unid_id = en_unid_id;
      exception
         when no_data_found then
            sn_cd_erro := 1;
            raise ve_erro;
         when others then
            sn_cd_erro := 90001;
            raise;
      end;

   EXCEPTION
      when ve_erro then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_POSTQUER';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sn_cd_erro
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
      when others then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_POSTQUER';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sqlcode
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
   END PKB_POSTQUER;

   /*
   _____________________________________________________________________________________________________________________
   Desenvolvido por: Desenvolvedor
   Data:             14/04/2026
   _____________________________________________________________________________________________________________________
   Definição:        Lista de valores da tabela unid, ordenada por nome
   _____________________________________________________________________________________________________________________
   Parâmetros:       st_unid                  Registros encontrados
                     sv_sistema               Sistema
                     sv_processo              Processo
                     sv_msg_erro              Mensagem de erro
                     sn_cd_erro               Código de erro
   _____________________________________________________________________________________________________________________
   */
   PROCEDURE PKB_LOV ( st_unid                    out nocopy t_tab_rec_unid
                     , sv_sistema               out nocopy varchar2
                     , sv_processo              out nocopy varchar2
                     , sv_msg_erro              out nocopy varchar2
                     , sn_cd_erro               out nocopy number
                     ) IS

   BEGIN

      st_unid.delete;

      begin
         select t.unid_id
              , t.cd
              , t.nro_ult_recibo
              , t.nome
              , t.empr_id
              , t.banco_id_pagto
              , t.banco_id_cobra
              , t.tpcobrantv_id
              , t.tppagtotv_id
              , t.ar_unid_id_princ
              , t.abrev
              , t.sit
           bulk collect into st_unid
           from unid t
          where t.sit = PK_COR_UNID.ATIVO
          order by t.nome;
      exception
         when others then
            sn_cd_erro := 90001;
            raise;
      end;

   EXCEPTION
      when ve_erro then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_LOV';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sn_cd_erro
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
      when others then
         sv_sistema  := 'COR';
         sv_processo := 'PK_COR_UNID.PKB_LOV';
         sn_cd_erro  := nvl(sn_cd_erro, 90000);
         pk_soft.pkb_busca_msg_erro ( en_cd       => sqlcode
                                    , ev_sg_sist  => sv_sistema
                                    , ev_objeto   => sv_processo
                                    , sv_msg_erro => sv_msg_erro
                                    );
   END PKB_LOV;

END PK_COR_UNID;
