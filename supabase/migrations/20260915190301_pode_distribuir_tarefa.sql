-- 🎯 QUEM PODE DISTRIBUIR TAREFA — 15/09/2026
--
-- ⚠️ O NÚMERO DO ARQUIVO (20260915190301) É O QUE O BANCO REGISTROU. Aplicada
-- pela API de gestão do Supabase (o SUPABASE_ACCESS_TOKEN segue morto), que
-- carimba a versão com a hora da APLICAÇÃO — por isso o arquivo foi renomeado
-- pra bater com o registro. Arquivo e registro 1:1 foi o que a PR #334 arrumou.
--
-- Pedido do dono: "esses dois usuários precisam ter a opção de distribuir
-- tarefa (essa opção o Emannuel também deve ter)", e o alcance escolhido foi
-- o (C): os três distribuem para qualquer um, igual ao dono.
--
-- ── POR QUE UMA COLUNA NOVA, E POR QUE NESTA TABELA ─────────────────────────
-- Até hoje a tela de distribuir era liberada por `visPapel.superAdmin`, ou
-- seja, só `role = 'super_admin'`. Não existia lugar nenhum para guardar
-- "esta pessoa pode distribuir". Os três candidatos naturais foram descartados
-- com motivo:
--
--   • career_levels        → é o PLANO DE COMISSÃO. Dar `diretoria_operacao` a
--                            um vendedor mexeria no 0,5% do pool.
--   • xgame_participantes.cargo → define a MULTA DE ATRASO (50/200/500).
--   • app_users.enabled_panels  → é a fonte de verdade da NAVEGAÇÃO; um valor
--                            estranho ali arrisca o menu da pessoa.
--
-- E `app_users` foi evitada de propósito: desde 15/09 ela tem privilégio por
-- COLUNA (migração auditoria_app_users_colunas_publicas). Coluna nova lá só
-- seria lida pelo navegador depois de liberada em dois lugares — acoplamento
-- que já custou caro hoje.
--
-- `xgame_participantes` é a tabela do próprio X-Game, que é de onde a tela de
-- distribuir vive, tem permissão no NÍVEL DA TABELA (coluna nova já nasce
-- legível) e já é editada pela ADM X-Game — então o interruptor tem casa.
--
-- Nasce `false`: ninguém ganha poder por acidente. Quem é super_admin continua
-- distribuindo sem depender desta coluna (ver podeDistribuirTarefa em
-- src/lib/xgame.js).
alter table public.xgame_participantes
  add column if not exists pode_distribuir boolean not null default false;

comment on column public.xgame_participantes.pode_distribuir is
  'Libera a tela Distribuir Tarefa para esta pessoa. Falso por padrao. '
  'super_admin distribui independente desta coluna. Interruptor na ADM X-Game.';
