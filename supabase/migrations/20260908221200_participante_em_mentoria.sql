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
