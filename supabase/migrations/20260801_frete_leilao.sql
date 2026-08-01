-- Frete calculado junto com o lance no leilão (Sala de Leilão).
-- frete_reservado_valor: valor de frete atualmente reservado para o LÍDER ATUAL
--   do leilão (usado para devolver o valor exato quando ele é superado).
-- frete_amount: valor de frete reservado no momento de CADA lance (auditoria).
ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS frete_reservado_valor numeric DEFAULT 0;

ALTER TABLE auction_messages
  ADD COLUMN IF NOT EXISTS frete_amount numeric DEFAULT 0;