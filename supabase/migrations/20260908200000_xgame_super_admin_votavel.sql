-- MvM MANUAL — o Super Admin não é votável por padrão (08/09/2026).
--
-- Dono: "Super Admin não pode ser votado a não ser que ele esteja
-- participando por dentro de uma mentoria — não é viável nem saudável pro
-- negócio se expor tanto o principal, ainda mais quando as pessoas às vezes
-- não têm capacidade de votar num mentor — salvo se ele mesmo permitir ser
-- votado na MvM."
--
-- Hoje `xgame_participantes.ativo=true` já é suficiente pra alguém aparecer
-- na lista de colegas votáveis de todo mundo — sem exceção nenhuma pro
-- cargo. Esta coluna dá ao Super Admin (e só a ele — a régua em código
-- checa `role`) um interruptor PRÓPRIO: fora da votação por padrão, dentro
-- só se ele mesmo ligar. Pra qualquer outro participante o valor é
-- irrelevante — a régua (`podeSerVotado` em src/lib/xgame.js) só olha esta
-- coluna quando o cargo é super_admin; para todo mundo mais, `ativo=true`
-- continua sendo suficiente, exatamente como hoje.
alter table public.xgame_participantes
  add column if not exists aceita_ser_votado boolean not null default true;

comment on column public.xgame_participantes.aceita_ser_votado is
  'Só tem efeito prático para quem é super_admin (ver podeSerVotado em src/lib/xgame.js): default true não muda nada pra ninguém que já era votável; o super_admin decide ele mesmo se entra na MvM Manual.';
