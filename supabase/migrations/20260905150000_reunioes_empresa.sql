-- DIR-52 (05/09/2026) — REUNIÕES DA EMPRESA: o espaço fixo das reuniões do
-- negócio ("toda segunda: Mentalidade do Diretor e Mentalidade do CEO").
-- Cadastra uma vez (admin), aparece recorrente na agenda de TODO MUNDO do
-- público, com selo 🏛️ na linha do tempo do Hábito 4.
CREATE TABLE IF NOT EXISTS public.reunioes_empresa (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , titulo TEXT NOT NULL
  , dia_semana SMALLINT           -- 0=domingo ... 6=sábado; NULL = data única
  , data DATE                      -- usada quando dia_semana é NULL
  , hora TEXT NOT NULL             -- 'HH:mm'
  , duracao_min INTEGER DEFAULT 60
  , publico TEXT DEFAULT 'todos'   -- 'todos' | 'diretoria'
  , detalhes TEXT
  , ativo BOOLEAN NOT NULL DEFAULT true
  , criado_por_id TEXT
  , criado_por_nome TEXT
  , created_date TIMESTAMPTZ DEFAULT now()
  , updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reunioes_empresa ENABLE ROW LEVEL SECURITY;

-- Padrão da casa (igual metodo_perfil/metodo_tarefas): políticas permissivas —
-- a ESCRITA passa pelo entityWrite (só admin grava reunião da empresa) e a
-- leitura é aberta de propósito: a reunião da empresa é de todo mundo ver.
DO $$ BEGIN
  CREATE POLICY reunioes_empresa_select ON public.reunioes_empresa FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY reunioes_empresa_insert ON public.reunioes_empresa FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY reunioes_empresa_update ON public.reunioes_empresa FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY reunioes_empresa_delete ON public.reunioes_empresa FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.reunioes_empresa IS
  'Reuniões fixas do negócio (DIR-52): recorrentes por dia da semana ou data única, visíveis pra todos na agenda do Hábito 4';
