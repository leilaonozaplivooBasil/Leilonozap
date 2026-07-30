-- Migration: Adicionar coluna held_balance na tabela digital_wallets
-- e garantir colunas relacionadas na tabela digital_wallet_transactions
-- Data: 2026-07-30
-- Motivo: Correção do fluxo de lances — reservar saldo em vez de debitar

-- 1. Adicionar held_balance na tabela de carteiras
ALTER TABLE digital_wallets 
ADD COLUMN IF NOT EXISTS held_balance numeric DEFAULT 0;

-- 2. Garantir que related_auction_id existe na tabela de transações
-- (o schema Base44 já define, mas o banco pode não ter a coluna)
ALTER TABLE digital_wallet_transactions 
ADD COLUMN IF NOT EXISTS related_auction_id text;

-- 3. Adicionar related_message_id na tabela de transações
ALTER TABLE digital_wallet_transactions 
ADD COLUMN IF NOT EXISTS related_message_id text;

-- 4. Atualizar o enum de type para incluir novos tipos
-- PostgreSQL exige adicionar valores novos ao enum existente
ALTER TYPE digital_wallet_transaction_type 
ADD VALUE IF NOT EXISTS 'bid_hold';

ALTER TYPE digital_wallet_transaction_type 
ADD VALUE IF NOT EXISTS 'bid_release';

ALTER TYPE digital_wallet_transaction_type 
ADD VALUE IF NOT EXISTS 'auction_settlement';

ALTER TYPE digital_wallet_transaction_type 
ADD VALUE IF NOT EXISTS 'auction_refund';

-- 5. Atualizar o enum de status para incluir novos status
ALTER TYPE digital_wallet_transaction_status 
ADD VALUE IF NOT EXISTS 'released';

ALTER TYPE digital_wallet_transaction_status 
ADD VALUE IF NOT EXISTS 'settled';

ALTER TYPE digital_wallet_transaction_status 
ADD VALUE IF NOT EXISTS 'refunded';

-- 6. Comentário para documentação
COMMENT ON COLUMN digital_wallets.held_balance IS 'Saldo reservado em lances ativos (bloqueado em disputa)';
COMMENT ON COLUMN digital_wallet_transactions.related_message_id IS 'ID da mensagem de lance que gerou a reserva';