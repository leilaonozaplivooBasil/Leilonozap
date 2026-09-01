-- DIR-43 (01/09/2026) — O MÉTODO VIVO: os 8 Hábitos como ferramenta.
-- metodo_perfil  = o espaço pessoal de cada um (quadro dos sonhos, rotina
--                  padrão do Master Task, o script próprio, link da
--                  apresentação oficial).
-- metodo_tarefas = o MASTER TASK diário (o "Trello" do dia): tarefa por
--                  tarefa, com hora, feito/não feito e ordem.
-- customers.qualificacao = a LISTA DE NETWORK qualificada de 1 a 5.
CREATE TABLE IF NOT EXISTS public.metodo_perfil (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , user_id TEXT NOT NULL UNIQUE
  , sonhos JSONB
  , rotina JSONB
  , script TEXT
  , apresentacao_url TEXT
  , created_date TIMESTAMPTZ DEFAULT now()
  , updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.metodo_tarefas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , user_id TEXT NOT NULL
  , data DATE NOT NULL
  , hora TEXT
  , titulo TEXT NOT NULL
  , detalhe TEXT
  , feito BOOLEAN NOT NULL DEFAULT false
  , ordem INTEGER DEFAULT 0
  , created_date TIMESTAMPTZ DEFAULT now()
  , updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_metodo_tarefas_user_data ON public.metodo_tarefas (user_id, data);

ALTER TABLE public.metodo_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metodo_tarefas ENABLE ROW LEVEL SECURITY;

-- Padrão da casa (igual captacao_oportunidades): políticas permissivas — o
-- escopo por usuário é aplicado no app; a chave anon só lê/escreve o que o
-- app pede. Tarefa pessoal PODE ser apagada (diferente de oportunidade).
DO $$ BEGIN
  CREATE POLICY metodo_perfil_select ON public.metodo_perfil FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY metodo_perfil_insert ON public.metodo_perfil FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY metodo_perfil_update ON public.metodo_perfil FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY metodo_tarefas_select ON public.metodo_tarefas FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY metodo_tarefas_insert ON public.metodo_tarefas FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY metodo_tarefas_update ON public.metodo_tarefas FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY metodo_tarefas_delete ON public.metodo_tarefas FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 🤝 Hábito 3 — LISTA DE NETWORK qualificada: 1 a 5 estrelas por contato.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS qualificacao SMALLINT;

COMMENT ON COLUMN public.customers.qualificacao IS
  'Qualificação da lista de network (DIR-43): 1 a 5 estrelas, regra do método';
