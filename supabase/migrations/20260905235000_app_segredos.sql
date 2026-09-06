-- COFRE DE SEGREDOS DO SERVIDOR (05/09/2026) — nasce pra guardar a chave do
-- AI Gateway da X-GAME sem depender de variável de ambiente no Vercel.
-- RLS LIGADO e NENHUMA POLICY de propósito: a chave anon do navegador não lê
-- nem escreve NADA aqui; só o service role (as functions do backend) enxerga.
CREATE TABLE IF NOT EXISTS public.app_segredos (
  id TEXT PRIMARY KEY
  , valor TEXT NOT NULL
  , updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.app_segredos ENABLE ROW LEVEL SECURITY;
-- (sem policies: negado por padrão pra anon/authenticated; service role passa)
COMMENT ON TABLE public.app_segredos IS
  'Segredos do BACKEND (só service role): ex. ai_gateway_key do validador X-GAME. Nunca criar policy de SELECT aqui.';
