-- 🎓 X-GAME — participante do Programa da Mentoria.
--
-- ⚠️ ARQUIVO RECUPERADO DO BANCO EM 08/09/2026, NÃO ESCRITO DEPOIS.
-- Mesmo caso do 20260908174659: aplicada direto no projeto, registrada no
-- histórico do Supabase (versão 20260908223124) e sem arquivo aqui. O SQL é
-- cópia fiel do que está em supabase_migrations.schema_migrations.
--
-- 📌 A LIÇÃO, PRA NÃO REPETIR: aplicar migração pelo painel ou pelo MCP grava
-- a versão no histórico do banco mas NÃO cria o arquivo — e a partir daí todo
-- `db push` seguinte falha, então nenhuma migração nova entra em produção até
-- alguém perceber. Quem aplicar fora do fluxo tem que commitar o arquivo com o
-- MESMO nome (<versão>_<nome>.sql) no mesmo dia.
alter table public.xgame_participantes
  add column if not exists em_mentoria boolean not null default false;

comment on column public.xgame_participantes.em_mentoria is
  'Participa do Programa da Mentoria (8 Hábitos, set/2026-mar/2027) — independente de "ativo" (vota/recebe voto no MVM). Uma pessoa pode votar sem estar na mentoria, e vice-versa.';
