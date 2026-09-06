-- 🎓 A TAREFA COM MENTALIDADE (06/09/2026)
--
-- Ditado pelo dono, na gestão do X-Performance: "eu preciso ter ali as
-- funções do executivo, do diretor e do CEO, e cada vez que eu for atribuir
-- algo eu boto que essa tarefa é de mentalidade do diretor, do CEO — sempre
-- explicando a ele como funciona um diretor. É um ensinamento. Planejamento
-- com ensinamento."
--
-- MIGRAÇÃO ADITIVA: só ADD COLUMN IF NOT EXISTS.
--  • metodo_tarefas.mentalidade — executivo | diretor | ceo (a trilha da
--    tarefa; o peso ganha o acréscimo da mentalidade e o `detalhe` recebe o
--    ensinamento de como aquela mentalidade trabalha).
--  • metodo_tarefas.habito      — 1 a 8, o Hábito do Sucesso que ela serve.
ALTER TABLE public.metodo_tarefas
  ADD COLUMN IF NOT EXISTS mentalidade TEXT,
  ADD COLUMN IF NOT EXISTS habito SMALLINT;

COMMENT ON COLUMN public.metodo_tarefas.mentalidade IS
  'X-PERFORMANCE: a trilha da tarefa (executivo | diretor | ceo). NULL = tarefa da rotina, sem mentalidade atribuída.';
COMMENT ON COLUMN public.metodo_tarefas.habito IS
  'X-PERFORMANCE: o Hábito do Sucesso (1-8) que a tarefa serve.';
