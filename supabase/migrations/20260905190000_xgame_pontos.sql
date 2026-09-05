-- X-GAME (05/09/2026) — a gamificação do Método sobre o Master Task.
-- Traduz pro app o motor da planilha "X-GAME — Guia Prático do Sucesso":
-- ciclo de 22 dias úteis, MvM do Dia que começa em 10 e decai quando a
-- tarefa passa da hora sem ser marcada, Aplicabilidade do ciclo (máx 12,22),
-- Human Token (máx 22,22) com faixas bronze/prata/ouro, e cotação do dia
-- que vale mais no começo do ciclo ("antecipação é poder").
--
-- xgame_diario = a FOTOGRAFIA de cada dia por pessoa (recalculável a
-- qualquer momento a partir de metodo_tarefas — nada aqui é fonte primária
-- de dinheiro; é placar). Uma linha por pessoa por dia.
CREATE TABLE IF NOT EXISTS public.xgame_diario (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , user_id TEXT NOT NULL
  , data DATE NOT NULL
  , ciclo_inicio DATE NOT NULL
  , tarefas_total INTEGER NOT NULL DEFAULT 0
  , tarefas_feitas INTEGER NOT NULL DEFAULT 0
  , mvm_dia NUMERIC(6,2) NOT NULL DEFAULT 0       -- 0 a 10 (decai em tempo real)
  , aplicabilidade NUMERIC(6,2) NOT NULL DEFAULT 0 -- 0 a 12,22 (constância no ciclo)
  , token_dia NUMERIC(6,2) NOT NULL DEFAULT 0      -- 0 a 22,22 (mvm + aplicabilidade)
  , cotacao NUMERIC(4,2) NOT NULL DEFAULT 1        -- 1,00 no dia 1 → 0,80 no dia 22
  , pontos INTEGER NOT NULL DEFAULT 0              -- pontos do dia já com a cotação
  , detalhes JSONB
  , created_date TIMESTAMPTZ DEFAULT now()
  , updated_at TIMESTAMPTZ DEFAULT now()
  , UNIQUE (user_id, data)
);
CREATE INDEX IF NOT EXISTS idx_xgame_diario_user_data ON public.xgame_diario (user_id, data);
CREATE INDEX IF NOT EXISTS idx_xgame_diario_ciclo ON public.xgame_diario (ciclo_inicio);

ALTER TABLE public.xgame_diario ENABLE ROW LEVEL SECURITY;

-- Padrão da casa (igual metodo_tarefas): políticas permissivas — o escopo
-- por usuário é aplicado no app; a chave anon só lê/escreve o que o app pede.
DO $$ BEGIN
  CREATE POLICY xgame_diario_select ON public.xgame_diario FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xgame_diario_insert ON public.xgame_diario FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xgame_diario_update ON public.xgame_diario FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.xgame_diario IS
  'X-GAME: placar diário da gamificação do Método (1 linha por pessoa por dia; recalculável a partir de metodo_tarefas)';

-- Ranking do ciclo: soma dos pontos de cada pessoa dentro de cada ciclo.
-- View simples em cima do placar — quem consome escolhe o ciclo_inicio.
CREATE OR REPLACE VIEW public.xgame_ranking_ciclo AS
  SELECT ciclo_inicio, user_id,
         SUM(pontos)::integer AS pontos,
         AVG(token_dia)::numeric(6,2) AS token_medio,
         COUNT(*)::integer AS dias_jogados,
         MAX(data) AS ultimo_dia
    FROM public.xgame_diario
   GROUP BY ciclo_inicio, user_id;

COMMENT ON VIEW public.xgame_ranking_ciclo IS
  'X-GAME: ranking por ciclo de 22 dias úteis (soma de pontos e token médio por pessoa)';
