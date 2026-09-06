-- 📅 DIR-80 — A ROTINA É DELA, E ELA SE REPETE (dono, 06/09/2026):
-- "foi gerada uma vez, ela tem que ficar todo dia, só se a pessoa pedir pra
-- parar... existem pessoas que não vão pra empresa, então ela tem outra rotina."
--
-- A coluna `rotina` (JSONB) já existia em metodo_perfil desde a migração do
-- Método — e a tela só LIA dela. Ninguém nunca escreveu, então todo mundo
-- recebia a rotina da casa e não conseguia ter a sua. O que faltava era o
-- LIGA/DESLIGA da repetição, e a data em que ela ligou.
--
-- Por que a data importa: sem ela, ligar a rotina hoje encheria também os dias
-- passados que estivessem vazios — a pessoa abriria a semana anterior e veria
-- tarefas que nunca existiram, todas marcadas como perdidas. A data é o piso.
ALTER TABLE public.metodo_perfil
  ADD COLUMN IF NOT EXISTS rotina_automatica BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rotina_automatica_desde DATE;

COMMENT ON COLUMN public.metodo_perfil.rotina_automatica IS
  'DIR-80: a rotina se repete todo dia sozinha. Liga na primeira geração; só desliga se a pessoa pedir.';
COMMENT ON COLUMN public.metodo_perfil.rotina_automatica_desde IS
  'DIR-80: o dia em que ligou. A geração automática nunca age antes desta data — senão encheria dias passados de tarefa perdida que nunca existiu.';
