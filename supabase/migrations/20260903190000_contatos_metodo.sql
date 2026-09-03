-- DIR-47 (03/09/2026) — CONTATO E CONVITE VIVO.
-- Histórico de contatos do método por cliente (array JSONB, append-only
-- pelo app): { "id", "resultado": "feito"|"agendado"|"retornar"|
-- "nao_atendeu"|"sem_interesse", "em": timestamptz do registro,
-- "quando": data/hora da reunião (se agendado), "retornar_em": data do
-- retorno (se pediu pra retornar), "obs", "registrado_por_id",
-- "registrado_por_nome" }.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS contatos_metodo JSONB;

COMMENT ON COLUMN public.customers.contatos_metodo IS
  'Histórico de contatos do método (DIR-47): resultado, agendamento, retorno e observação de cada contato feito';
