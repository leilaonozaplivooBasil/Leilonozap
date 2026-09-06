-- 💰 O FIXO DISTRIBUÍDO PELO PESO DAS TAREFAS (06/09/2026)
--
-- Ditado pelo dono, no X-Performance: "o Emanuel vai ganhar sete mil por mês;
-- isso tem que ser distribuído em todas as tarefas, de acordo com o peso, em
-- x tarefas no dia, mínimo — e conforme eu for colocando, o sistema tira das
-- outras automaticamente pra dar sete mil no total".
--
-- MIGRAÇÃO ADITIVA: só ADD COLUMN IF NOT EXISTS. Nada existente muda de tipo,
-- nenhuma linha é tocada.
--
--  • xgame_participantes.fixo_mes   — o fixo mensal da pessoa (R$). NULL = a
--    conta usa a verba de produção que já existia, então quem já está no jogo
--    não vê o valor mudar de uma hora pra outra.
--  • xgame_participantes.minimo_dia — quantas tarefas o dia precisa ter pra
--    pagar inteiro (padrão 3). Dia com menos paga proporcional.
--  • metodo_tarefas.origem          — 'xperf' quando a tarefa nasceu na
--    gestão do X-Performance (o "menu suspenso" do dono), pra listar "a
--    distribuição de todas as tarefas a partir dali".
--  • metodo_tarefas.criado_por_id   — quem distribuiu a tarefa.
ALTER TABLE public.xgame_participantes
  ADD COLUMN IF NOT EXISTS fixo_mes NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS minimo_dia SMALLINT NOT NULL DEFAULT 3;

ALTER TABLE public.metodo_tarefas
  ADD COLUMN IF NOT EXISTS origem TEXT,
  ADD COLUMN IF NOT EXISTS criado_por_id TEXT;

COMMENT ON COLUMN public.xgame_participantes.fixo_mes IS
  'X-PERFORMANCE: fixo mensal da pessoa em R$. fixo ÷ 22 dias úteis = valor do dia, repartido pelo peso das tarefas. NULL = usa verba_producao.';
COMMENT ON COLUMN public.xgame_participantes.minimo_dia IS
  'X-PERFORMANCE: tarefas mínimas por dia pra pagar o dia inteiro; com menos, paga proporcional.';
COMMENT ON COLUMN public.metodo_tarefas.origem IS
  'De onde a tarefa nasceu: NULL = a própria pessoa/rotina; xperf = distribuída na gestão do X-Performance.';
