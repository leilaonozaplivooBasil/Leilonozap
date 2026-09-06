-- 📣 PONTO 69 — MODO CHAMADA (PRÉ-LANÇAMENTO)
-- Leilão visível na vitrine com lances bloqueados até a data/hora de abertura.
-- Migração ADITIVA: nenhum campo existente é alterado; leilões atuais nascem
-- com modo_chamada = false, ou seja, comportamento idêntico ao de hoje.

ALTER TABLE auctions ADD COLUMN IF NOT EXISTS modo_chamada BOOLEAN DEFAULT false;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS data_abertura_lances TIMESTAMPTZ;

COMMENT ON COLUMN auctions.modo_chamada IS 'PONTO 69: true = leilão em pré-lançamento (visível, lances bloqueados até data_abertura_lances)';
COMMENT ON COLUMN auctions.data_abertura_lances IS 'PONTO 69: data/hora em que os lances são liberados (UTC)';