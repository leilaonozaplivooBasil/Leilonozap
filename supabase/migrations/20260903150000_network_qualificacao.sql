-- DIR-46 (03/09/2026) — LISTA DE NETWORK QUALIFICADA.
-- Cada contato da lista ganha a qualificação completa do método:
--   { "produto": "parceiro_compra" | "licencas",
--     "confianca": 1-5, "financeiro": 1-5, "apetite": 1-5 }
-- A probabilidade de fechamento é DERIVADA no app (fonte única testada),
-- nunca gravada — número calculado não se armazena pra não divergir.
-- A coluna legada customers.qualificacao (estrela única, DIR-43) fica
-- intocada.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS qualificacao_network JSONB;

COMMENT ON COLUMN public.customers.qualificacao_network IS
  'Qualificação da lista de network (DIR-46): produto apresentado + notas 1-5 de confiança, condição financeira e apetite';
