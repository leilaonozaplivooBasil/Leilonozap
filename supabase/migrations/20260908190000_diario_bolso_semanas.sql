-- DIÁRIO DE BOLSO — terreno da Fase 3 (dono, 08/09/2026: "prepare o
-- terreno para a fase 3"). Guarda o resumo narrado por IA de uma semana —
-- gerado por api/functions/diarioResumoSemanal.js, que NENHUMA tela ainda
-- chama. Só existir esta tabela não gasta um centavo: o custo só existe
-- quando alguém, de propósito, chamar a rota (ou ela for ligada a um botão
-- ou cron, decisão futura).
CREATE TABLE IF NOT EXISTS public.diario_bolso_semanas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , user_id TEXT NOT NULL
  , semana_inicio DATE NOT NULL   -- a segunda-feira da semana resumida
  , resumo TEXT NOT NULL
  , model TEXT                    -- qual modelo gerou (auditoria de custo)
  , gerado_em TIMESTAMPTZ DEFAULT now()
  , UNIQUE (user_id, semana_inicio) -- gerar de novo a mesma semana atualiza, não duplica
);
CREATE INDEX IF NOT EXISTS idx_diario_bolso_semanas_user ON public.diario_bolso_semanas (user_id, semana_inicio);

ALTER TABLE public.diario_bolso_semanas ENABLE ROW LEVEL SECURITY;

-- Padrão da casa (igual metodo_tarefas/xgame_diario/diario_bolso_entradas):
-- políticas permissivas — o escopo por usuário é aplicado no app.
DO $$ BEGIN
  CREATE POLICY diario_bolso_semanas_select ON public.diario_bolso_semanas FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY diario_bolso_semanas_insert ON public.diario_bolso_semanas FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY diario_bolso_semanas_update ON public.diario_bolso_semanas FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.diario_bolso_semanas IS
  'Diário de bolso (Fase 3, terreno preparado em 08/09/2026 — nenhuma tela chama ainda): o resumo narrado por IA de uma semana, uma linha por pessoa por semana.';
