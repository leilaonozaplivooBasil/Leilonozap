-- 💵 SALDO DE OPERAÇÃO (08/08/2026)
--
-- Canal de saldo criado para quem vende NA RUA e recebe do cliente em DINHEIRO.
-- O vendedor/lojista/licenciado deposita esse dinheiro na plataforma e usa o
-- saldo para pagar os pedidos (compra de estoque e balcão).
--
-- POR QUE UMA COLUNA NOVA, e não reaproveitar uma existente:
--   • saldo_disponivel  = crédito de DEPÓSITO/LEILÃO — pode estar lastreando lance
--     vivo; gastar aqui deixaria o leilão descoberto.
--   • commission_balance = comissão ganha, essa SIM é sacável.
--   • credito_estoque    = espelho travado da mercadoria já paga.
-- Misturar qualquer uma delas com dinheiro de operação criaria uma segunda fonte
-- de verdade e o saque sairia errado.
--
-- REGRA OFICIAL (Gabriel, 08/08/2026): este saldo NÃO É SACÁVEL.
-- Só sai em mercadoria (pedido) ou por transferência para outra pessoa da rede
-- (tela Transferir Saldo, que já existe). Nunca vira PIX de volta.

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS saldo_operacao numeric DEFAULT 0;

COMMENT ON COLUMN app_users.saldo_operacao IS
  'Saldo de operação: dinheiro depositado para pagar pedidos (estoque e balcão). NÃO sacável — só sai em mercadoria ou transferência.';