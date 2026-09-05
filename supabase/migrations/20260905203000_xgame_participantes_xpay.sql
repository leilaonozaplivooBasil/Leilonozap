-- X-GAME F1 (05/09/2026) — fundação: participantes, ciclo oficial e a
-- classificação das tarefas (categoria + peso), pro X-PAY calcular dinheiro
-- igual à planilha: verba fixa ÷ 22 dias ÷ nº de tarefas × peso.

-- Tarefa ganha categoria e peso (padrões = produção com peso 3, como na planilha).
ALTER TABLE public.metodo_tarefas
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'producao',
  ADD COLUMN IF NOT EXISTS peso SMALLINT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS conferido BOOLEAN; -- conferência dupla do gestor (F5)

COMMENT ON COLUMN public.metodo_tarefas.categoria IS
  'X-GAME: producao | bonus | venda | mentoria | visao (vazio = producao; leitura/estudo vira bonus pelo título)';
COMMENT ON COLUMN public.metodo_tarefas.peso IS 'X-GAME: peso 1 a 6 da atividade (padrão 3, como na planilha)';

-- Quem joga a X-GAME, com cargo, perfil e verbas (o admin gerencia — F5).
CREATE TABLE IF NOT EXISTS public.xgame_participantes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , user_id TEXT NOT NULL UNIQUE
  , cargo TEXT NOT NULL DEFAULT 'executivo'        -- trainee | executivo | diretor | ceo
  , perfil TEXT NOT NULL DEFAULT 'estrategico'     -- estrategico | comercial | operacional
  , verba_producao NUMERIC(10,2) NOT NULL DEFAULT 1300
  , verba_bonus NUMERIC(10,2) NOT NULL DEFAULT 200
  , valor_venda NUMERIC(10,2) NOT NULL DEFAULT 50
  , multa_atraso NUMERIC(10,2) NOT NULL DEFAULT 200 -- Trainee 50 · Executivo 200 · Diretor 500
  , ativo BOOLEAN NOT NULL DEFAULT true
  , created_date TIMESTAMPTZ DEFAULT now()
  , updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.xgame_participantes IS
  'X-GAME: participantes do jogo com cargo, perfil e verbas (planilha: H7/H8/H9 + multas do FAQ)';

-- Ciclo oficial do jogo (o INÍCIO X-GAME do H-TOKEN!J2 da planilha).
-- Sem linha vigente, o app usa o 1º dia útil do mês como início.
CREATE TABLE IF NOT EXISTS public.xgame_config (
  id TEXT PRIMARY KEY DEFAULT 'atual'
  , ciclo_inicio DATE
  , updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.xgame_config IS 'X-GAME: configuração global (início do ciclo de 22 dias úteis)';

ALTER TABLE public.xgame_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xgame_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY xgame_participantes_select ON public.xgame_participantes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xgame_participantes_insert ON public.xgame_participantes FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xgame_participantes_update ON public.xgame_participantes FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xgame_config_select ON public.xgame_config FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xgame_config_insert ON public.xgame_config FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xgame_config_update ON public.xgame_config FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
