-- X-GAME F3 (05/09/2026) — MvM MANUAL: a votação diária dos pares (1 a 10)
-- nas 10 Virtudes, janela 20h–22h (regra da planilha: "a votação do MvM deve
-- ser realizada de casa"). Um voto por votante × votado × virtude × dia.
CREATE TABLE IF NOT EXISTS public.xgame_votos_mvm (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , votante_id TEXT NOT NULL
  , votado_id TEXT NOT NULL
  , data DATE NOT NULL
  , virtude TEXT NOT NULL
  , nota SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 10)
  , created_date TIMESTAMPTZ DEFAULT now()
  , updated_at TIMESTAMPTZ DEFAULT now()
  , UNIQUE (votante_id, votado_id, data, virtude)
);
CREATE INDEX IF NOT EXISTS idx_xgame_votos_votado ON public.xgame_votos_mvm (votado_id, data);
CREATE INDEX IF NOT EXISTS idx_xgame_votos_votante ON public.xgame_votos_mvm (votante_id, data);

COMMENT ON TABLE public.xgame_votos_mvm IS
  'X-GAME: votação diária do MvM manual — notas 1-10 dos pares nas 10 Virtudes (Ranking das Virtudes)';

ALTER TABLE public.xgame_votos_mvm ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY xgame_votos_select ON public.xgame_votos_mvm FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xgame_votos_insert ON public.xgame_votos_mvm FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xgame_votos_update ON public.xgame_votos_mvm FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
