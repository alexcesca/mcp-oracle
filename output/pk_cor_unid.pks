PACKAGE PK_COR_UNID IS
   ---

   -- -------------------------------------------------------------------------------------
   --  Constantes de domínio
   -- -------------------------------------------------------------------------------------
   -- SIT
   INATIVO                             constant unid.sit%type                             := 0;
   ATIVO                               constant unid.sit%type                             := 1;

   -- -------------------------------------------------------------------------------------
   --  Tipo de dados principal
   -- -------------------------------------------------------------------------------------
   type t_rec_unid              is record ( unid_id          unid.unid_id%type
                                          , cd               unid.cd%type
                                          , nro_ult_recibo   unid.nro_ult_recibo%type
                                          , nome             unid.nome%type
                                          , empr_id          unid.empr_id%type
                                          , banco_id_pagto   unid.banco_id_pagto%type
                                          , banco_id_cobra   unid.banco_id_cobra%type
                                          , tpcobrantv_id    unid.tpcobrantv_id%type
                                          , tppagtotv_id     unid.tppagtotv_id%type
                                          , ar_unid_id_princ unid.ar_unid_id_princ%type
                                          , abrev            unid.abrev%type
                                          , sit              unid.sit%type
                                          );
   type t_tab_rec_unid          is table of t_rec_unid                   index by binary_integer;

   -- -------------------------------------------------------------------------------------
   --  Funções
   -- -------------------------------------------------------------------------------------
   FUNCTION  FKG_SEQ                   RETURN unid.unid_id%type;

   -- -------------------------------------------------------------------------------------
   --  Procedures padrão
   -- -------------------------------------------------------------------------------------
   PROCEDURE PKB_VAL_UNID             ( en_unid_id              in            unid.unid_id%type
                                      , sv_sistema               out nocopy varchar2
                                      , sv_processo              out nocopy varchar2
                                      , sv_msg_erro              out nocopy varchar2
                                      , sn_cd_erro               out nocopy number
                                      );

   PROCEDURE PKB_CON_UNID             ( en_cd                   in            unid.cd%type
                                      , ev_nome                 in            unid.nome%type
                                      , en_sit                  in            unid.sit%type
                                      , est_unid                in out nocopy t_tab_rec_unid
                                      , sv_sistema               out nocopy varchar2
                                      , sv_processo              out nocopy varchar2
                                      , sv_msg_erro              out nocopy varchar2
                                      , sn_cd_erro               out nocopy number
                                      );

   PROCEDURE PKB_INC_UNID             ( est_unid                in out nocopy t_tab_rec_unid
                                      , sv_sistema               out nocopy varchar2
                                      , sv_processo              out nocopy varchar2
                                      , sv_msg_erro              out nocopy varchar2
                                      , sn_cd_erro               out nocopy number
                                      );

   PROCEDURE PKB_ALT_UNID             ( est_unid                in out nocopy t_tab_rec_unid
                                      , sv_sistema               out nocopy varchar2
                                      , sv_processo              out nocopy varchar2
                                      , sv_msg_erro              out nocopy varchar2
                                      , sn_cd_erro               out nocopy number
                                      );

   PROCEDURE PKB_EXC_UNID             ( est_unid                in out nocopy t_tab_rec_unid
                                      , sv_sistema               out nocopy varchar2
                                      , sv_processo              out nocopy varchar2
                                      , sv_msg_erro              out nocopy varchar2
                                      , sn_cd_erro               out nocopy number
                                      );

   PROCEDURE PKB_LOC_UNID             ( est_unid                in out nocopy t_tab_rec_unid
                                      , sv_sistema               out nocopy varchar2
                                      , sv_processo              out nocopy varchar2
                                      , sv_msg_erro              out nocopy varchar2
                                      , sn_cd_erro               out nocopy number
                                      );

   PROCEDURE PKB_VALIDA               ( en_cd                   in            unid.cd%type
                                      , st_unid                    out nocopy t_tab_rec_unid
                                      , sv_sistema               out nocopy varchar2
                                      , sv_processo              out nocopy varchar2
                                      , sv_msg_erro              out nocopy varchar2
                                      , sn_cd_erro               out nocopy number
                                      );

   PROCEDURE PKB_POSTQUER             ( en_unid_id              in            unid.unid_id%type
                                      , st_unid                    out nocopy t_tab_rec_unid
                                      , sv_sistema               out nocopy varchar2
                                      , sv_processo              out nocopy varchar2
                                      , sv_msg_erro              out nocopy varchar2
                                      , sn_cd_erro               out nocopy number
                                      );

   PROCEDURE PKB_LOV                  ( st_unid                    out nocopy t_tab_rec_unid
                                      , sv_sistema               out nocopy varchar2
                                      , sv_processo              out nocopy varchar2
                                      , sv_msg_erro              out nocopy varchar2
                                      , sn_cd_erro               out nocopy number
                                      );

END PK_COR_UNID;
