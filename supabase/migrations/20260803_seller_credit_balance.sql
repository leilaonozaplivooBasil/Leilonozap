-- Adiciona a coluna seller_credit_balance na tabela app_users (produção).
-- Sem esta coluna, o crédito de adesão do Vendedor (R$1.497) nunca é gravado
-- pelo webhook de pagamento, e a página de escolha de produtos nunca vê saldo.
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS seller_credit_balance numeric NOT NULL DEFAULT 0;