-- DIR-40 (01/09/2026) — APORTE RECEBIDO POR FORA: quando o dinheiro do
-- contrato entra por transferência direto na conta da empresa (SOMENTE
-- Santander ou Itaú — regra do dono), o recebimento é registrado com
-- auditoria: banco, valor, data e QUEM registrou, quando. É este registro
-- que acende o "💰 na conta" e soma na meta de captação — nunca um clique
-- sem lastro.
ALTER TABLE public.captacao_oportunidades
  ADD COLUMN IF NOT EXISTS aporte_externo JSONB;

COMMENT ON COLUMN public.captacao_oportunidades.aporte_externo IS
  'Aporte recebido fora do app: {banco: santander|itau, valor, data, registrado_por_id, registrado_por, em} — DIR-40';
