-- Adiciona a coluna frete_reservado_valor na tabela auctions (produção).
-- Sem essa coluna, submitAtomicBid falha com erro 42703 ("column does not exist")
-- e nenhum lance consegue ser processado.
ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS frete_reservado_valor numeric DEFAULT 0;