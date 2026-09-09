-- PERDÃO DA ZERAGEM — "hoje pode dar o ponto pra todo mundo... porque foi o
-- primeiro dia" (dono, 09/09/2026, ao vivo no grupo, depois do bug de fuso
-- horário zerar gente às 21h).
--
-- Achado além do bug de fuso: duas pessoas (João Paim, Ailton) entraram na
-- lista de votáveis às 19h11 de hoje — DENTRO da janela de votação (17h às
-- 21h30). Quem já tinha votado nos colegas de antes ficou sem ter votado
-- nesses dois a tempo, incluindo o próprio dono (super_admin) — não é bug,
-- é a régua funcionando exatamente como desenhada, só que injusta no dia
-- em que a lista mudou no meio do jogo. Dono: "não zera ninguém hoje, a
-- partir de amanhã a regra é séria" — precisa de um jeito de perdoar UM
-- dia inteiro sem desligar a régua pros próximos.
alter table public.xgame_config
  add column if not exists perdao_zeragem_ate date;

comment on column public.xgame_config.perdao_zeragem_ate is
  'Enquanto a data de hoje (local) for <= este valor, resumoDoDia() (src/lib/xgame.js) NUNCA zera o dia por não-votar/atraso-do-pronto, não importa o motivo — é um perdão total daquele dia, não uma trava de regra. null = sem perdão ativo (comportamento normal). É de uso raro e manual: o super_admin liga só quando algo excepcional (bug, lista de votação mudou no meio do dia) injustiçou todo mundo, e desliga (null) no dia seguinte.';
