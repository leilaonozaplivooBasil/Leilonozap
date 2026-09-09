-- 🗳️ X-GAME — super admin decide se entra na MvM Manual.
--
-- ⚠️ ARQUIVO RECUPERADO DO BANCO EM 08/09/2026, NÃO ESCRITO DEPOIS.
-- Esta migração foi aplicada DIRETO no projeto (painel/MCP), então ficou
-- registrada no histórico do Supabase (versão 20260908174659) sem nunca ter
-- tido arquivo aqui. O `supabase db push` compara os dois lados e recusa
-- rodar quando o banco tem versão que o repositório não tem — foi isso que
-- derrubou os deploys de migração de 21:34, 22:35 e 23:05 de 08/09, cada um
-- deles deixando de aplicar a migração que vinha junto no merge, calado.
--
-- O SQL abaixo é o que está gravado em supabase_migrations.schema_migrations
-- para esta versão, copiado sem alteração. Não roda de novo (a versão já
-- consta como aplicada); está aqui para o repositório voltar a ser o retrato
-- fiel do banco, que é a única coisa que destrava a fila.
alter table public.xgame_participantes
  add column if not exists aceita_ser_votado boolean not null default true;

comment on column public.xgame_participantes.aceita_ser_votado is
  'Só tem efeito prático para quem é super_admin (ver podeSerVotado em src/lib/xgame.js): default true não muda nada pra ninguém que já era votável; o super_admin decide ele mesmo se entra na MvM Manual.';
