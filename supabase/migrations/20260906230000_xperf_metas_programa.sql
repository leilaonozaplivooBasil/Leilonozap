-- 🎯 AS METAS DA PESSOA E O PROGRAMA DA MENTORIA (06/09/2026)
--
-- Ditado pelo dono, no Quadro Geral da pessoa: "tudo, tudo, tudo: função,
-- cargo, valores, o que fazer, META MENSAL, ENTREGÁVEIS DA MENTORIA que
-- começou em setembro e vai até março de 2027, os PRODUTOS que precisa
-- vender". E sobre a página Metas antiga: "acaba com ela e joga pra dentro".
-- Sobre o programa: "manda o seu, mas eu podendo acrescentar, excluir".
--
-- MIGRAÇÃO ADITIVA: duas tabelas novas.
--  • xperf_metas    — a meta de UMA pessoa em UM mês: número (reuniões,
--    contatos, apresentações, fechamentos, contratos, faturamento) ou
--    produto (quantidade de um produto do catálogo). O progresso não é
--    gravado: é calculado das tarefas feitas e das vendas.
--  • xperf_programa — o programa da mentoria por mês: tema, Hábitos e os
--    entregáveis (por mentalidade). O padrão mora no código; o que o dono
--    salva/edita fica aqui e vale por cima.
CREATE TABLE IF NOT EXISTS public.xperf_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  , user_id TEXT NOT NULL
  , mes TEXT NOT NULL                       -- 'YYYY-MM'
  , tipo TEXT NOT NULL DEFAULT 'numero'     -- numero | produto
  , chave TEXT NOT NULL                     -- reunioes | contatos | apresentacoes | fechamentos | contratos | faturamento | produto:<id>
  , rotulo TEXT NOT NULL
  , alvo NUMERIC(12,2) NOT NULL DEFAULT 0
  , unidade TEXT                            -- 'por dia' | 'no mês' | 'R$' | 'un'
  , produto_id TEXT
  , produto_nome TEXT
  , criado_por_id TEXT
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_xperf_metas_pessoa_mes ON public.xperf_metas (user_id, mes);

CREATE TABLE IF NOT EXISTS public.xperf_programa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  , mes TEXT NOT NULL UNIQUE                -- 'YYYY-MM'
  , tema TEXT NOT NULL
  , habitos SMALLINT[] NOT NULL DEFAULT '{}'
  , entregaveis JSONB NOT NULL DEFAULT '[]'::jsonb   -- [{titulo, mentalidade, habito, peso}]
  , ordem INTEGER NOT NULL DEFAULT 0
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.xperf_metas IS 'X-PERFORMANCE: a meta de uma pessoa num mês (número ou produto). Progresso calculado, não gravado.';
COMMENT ON TABLE public.xperf_programa IS 'X-PERFORMANCE: o programa da mentoria por mês (set/2026 a mar/2027), editável pelo dono. O padrão mora em src/lib/programaMentoria.js.';

ALTER TABLE public.xperf_metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xperf_programa ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY xperf_metas_select ON public.xperf_metas FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY xperf_metas_insert ON public.xperf_metas FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY xperf_metas_update ON public.xperf_metas FOR UPDATE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY xperf_metas_delete ON public.xperf_metas FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY xperf_programa_select ON public.xperf_programa FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY xperf_programa_insert ON public.xperf_programa FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY xperf_programa_update ON public.xperf_programa FOR UPDATE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY xperf_programa_delete ON public.xperf_programa FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
