-- 📚 O CATÁLOGO DE AÇÕES da gestão do X-Performance (06/09/2026)
--
-- Ditado pelo dono: "eu gostaria que o sistema me desse uma lista de opções
-- do que tem pra fazer; ao selecionar, ele já me diz o peso e a mentalidade;
-- e cada ação que eu for colocando eu poder adicionar nesse menu suspenso".
--
-- O catálogo INICIAL mora no código (src/lib/catalogoAcoes.js); esta tabela
-- guarda o que o dono acrescenta. A tela junta os dois. MIGRAÇÃO ADITIVA.
CREATE TABLE IF NOT EXISTS public.xperf_acoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  , titulo TEXT NOT NULL
  , mentalidade TEXT NOT NULL DEFAULT 'executivo'   -- executivo | diretor | ceo
  , habito SMALLINT CHECK (habito BETWEEN 1 AND 8)
  , peso SMALLINT NOT NULL DEFAULT 3 CHECK (peso BETWEEN 1 AND 6)
  , categoria TEXT NOT NULL DEFAULT 'mentoria'
  , usos INTEGER NOT NULL DEFAULT 0
  , criado_por_id TEXT
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS xperf_acoes_titulo_unico ON public.xperf_acoes (lower(titulo));

COMMENT ON TABLE public.xperf_acoes IS
  'X-PERFORMANCE: ações que o dono acrescentou ao catálogo de "o que tem pra fazer" (o catálogo inicial mora no código).';

ALTER TABLE public.xperf_acoes ENABLE ROW LEVEL SECURITY;
-- padrão da casa (igual xperf_entregaveis): leitura e escrita pelo app; a
-- tela só é alcançada pelo super admin
DO $$ BEGIN
  CREATE POLICY xperf_acoes_select ON public.xperf_acoes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xperf_acoes_insert ON public.xperf_acoes FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xperf_acoes_update ON public.xperf_acoes FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xperf_acoes_delete ON public.xperf_acoes FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
