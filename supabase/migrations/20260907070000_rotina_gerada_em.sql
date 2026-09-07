-- 🌅 DIR-81.1 (07/09/2026) — CONSERTO no primeiro dia do cron.
--
-- O `gerarJornadaDoDia` (migração anterior, 20260907060000) decidia "o dia
-- está vazio?" contando QUALQUER linha em `metodo_tarefas` pra hoje. Isso
-- quebrou no primeiro dia de verdade: o dono tinha UMA reunião avulsa do
-- Contato & Convite (sincronizada a noite antes) — não a Rotina Perfeita,
-- só um compromisso isolado — e o cron, vendo que "o dia não estava vazio",
-- pulou ele inteiro. Resultado: só a reunião apareceu, a jornada continuou
-- de fora. É exatamente o "só está aparecendo o que está na agenda" que o
-- dono viu e pediu pra investigar.
--
-- O CONSERTO: a idempotência do cron passa a morar NELE MESMO — uma data
-- gravada no perfil, não numa contagem de linha de uma tabela que qualquer
-- outra parte do app também escreve (reunião sincronizada, demanda
-- direcionada, card de quadro virado tarefa). `rotina_gerada_em` é escrita
-- toda vez que a Rotina Perfeita é gerada pra um dia — pelo cron, pelo botão
-- "gerar", pelo "regerar o dia" e pela repetição automática do
-- `deveGerarSozinha` (rotinaPessoal.js) — e é ISSO que o cron confere antes
-- de gerar de novo, nunca mais a tabela de tarefas.
ALTER TABLE public.metodo_perfil
  ADD COLUMN IF NOT EXISTS rotina_gerada_em DATE;

COMMENT ON COLUMN public.metodo_perfil.rotina_gerada_em IS
  'DIR-81.1: o último dia em que a Rotina Perfeita foi gerada pra esta pessoa (por qualquer caminho — cron, botão manual, repetição automática). É contra ISTO que o cron gerarJornadaDoDia confere antes de gerar de novo, não contra a contagem de linhas de metodo_tarefas — um compromisso avulso (reunião sincronizada, demanda) não pode travar a jornada de nascer ao redor dele.';
