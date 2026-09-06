-- 🗂️ DIR-76 (06/09/2026) — O NOSSO QUADRO, versão "melhor que o MeisterTask
-- e mais simples". Estudo em cima do quadro do dono lá: ele usa colunas como
-- CONTEXTOS (Academia, Sant'Anna, Trabalho), criou colunas "Concluídas" na
-- mão, e pré-numera vagas por dia da semana. Decisão: colunas viram LISTAS
-- nomeadas pela pessoa, o tempo fica no Compromisso, e o Feito é automático.
--
-- MIGRAÇÃO ADITIVA. Nenhuma linha se perde: o que estava em hoje/semana/depois
-- passa a ler como "aberto" (a lib trata os quatro valores velhos como
-- aberto), e ganha lista quando a pessoa abrir o quadro pela primeira vez.

-- ── AS LISTAS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.metodo_quadro_listas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , user_id TEXT NOT NULL
  , nome TEXT NOT NULL
  , cor TEXT                          -- um dos tons da casa; NULL = neutro
  , ordem INTEGER DEFAULT 0
  , recolhida BOOLEAN NOT NULL DEFAULT false   -- o "recolher" do MeisterTask
  , created_date TIMESTAMPTZ DEFAULT now()
  , updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_metodo_quadro_listas_user ON public.metodo_quadro_listas (user_id, ordem);
COMMENT ON TABLE public.metodo_quadro_listas IS
  'DIR-76: as listas (contextos) do quadro pessoal do Compromisso — Trabalho, Academia, Pessoal… nomeadas pela pessoa, recolhíveis.';

ALTER TABLE public.metodo_quadro_listas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY metodo_quadro_listas_select ON public.metodo_quadro_listas FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY metodo_quadro_listas_insert ON public.metodo_quadro_listas FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY metodo_quadro_listas_update ON public.metodo_quadro_listas FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY metodo_quadro_listas_delete ON public.metodo_quadro_listas FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── O CARD GANHA O QUE O DONO USA DE VERDADE ────────────────────────────────
ALTER TABLE public.metodo_quadro
  ADD COLUMN IF NOT EXISTS lista_id TEXT REFERENCES public.metodo_quadro_listas(id) ON DELETE SET NULL
  , ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '[]'::jsonb   -- [{texto, feito}]
  , ADD COLUMN IF NOT EXISTS responsavel_id TEXT
  , ADD COLUMN IF NOT EXISTS feito_em TIMESTAMPTZ;

-- a coluna deixa de ser horizonte e vira ESTADO: aberto | feito. Os valores
-- velhos continuam aceitos pra nenhuma linha existente violar o CHECK.
ALTER TABLE public.metodo_quadro DROP CONSTRAINT IF EXISTS metodo_quadro_coluna_check;
ALTER TABLE public.metodo_quadro
  ADD CONSTRAINT metodo_quadro_coluna_check CHECK (coluna IN ('aberto', 'feito', 'hoje', 'semana', 'depois'));
ALTER TABLE public.metodo_quadro ALTER COLUMN coluna SET DEFAULT 'aberto';

CREATE INDEX IF NOT EXISTS idx_metodo_quadro_lista ON public.metodo_quadro (lista_id, coluna);

COMMENT ON COLUMN public.metodo_quadro.checklist IS 'DIR-76: sub-itens do card, [{texto, feito}]. Fechar o último leva o card pro Feito sozinho.';
COMMENT ON COLUMN public.metodo_quadro.feito_em IS 'DIR-76: quando o card foi pro Feito. Depois de 7 dias sai da mesa.';
