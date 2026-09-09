-- ⚠️ NÃO APAGUE ESTE ARQUIVO POR PARECER DUPLICADO DO 20260908223124.
--
-- 09/09/2026 — conferido no banco: as DUAS versões estão registradas em
-- supabase_migrations.schema_migrations (20260908221200 e 20260908223124).
-- Apagar qualquer um dos dois arquivos faz o `supabase db push --include-all`
-- do deploy falhar com "Remote migration versions not found in local
-- migrations directory" — e a partir daí NENHUMA migração nova entra em
-- produção até alguém perceber. Foi exatamente o que travou o deploy por
-- horas em 08/09 (PR #248).
--
-- Os dois SQLs são idempotentes (`add column if not exists`), então rodar os
-- dois não custa nada. A duplicata é feia; o conserto dela é caro e arriscado.
-- Fica.

-- QUEM ESTÁ NA MENTORIA — separado de quem só vota no MVM (08/09/2026).
--
-- Dono: "eu preciso decidir quais pessoas estão participando do MVM, da
-- votação... de qual mentoria que as pessoas estão participando. Exemplo,
-- tem um menino que não está na mentoria, mas é usuário, está no
-- planejamento, e entra na votação." Ou seja: "está na mentoria" e "vota no
-- MVM" (xgame_participantes.ativo) são coisas DIFERENTES — uma pessoa pode
-- votar sem estar na mentoria oficial, e vice-versa.
alter table public.xgame_participantes
  add column if not exists em_mentoria boolean not null default false;

comment on column public.xgame_participantes.em_mentoria is
  'Participa do Programa da Mentoria (8 Hábitos, set/2026-mar/2027) — independente de "ativo" (vota/recebe voto no MVM). Uma pessoa pode votar sem estar na mentoria, e vice-versa.';
