-- ============================================================
-- Migration: held_balance no fluxo de lances (reserva/libera)
-- Data: 2026-07-30
-- Motivo: Correção do fluxo — reservar saldo em vez de debitar
--
-- ⚠️ IMPORTANTE: As tabelas digital_wallets e digital_wallet_transactions
-- guardam os campos das entidades dentro da coluna JSONB raw_base44.
-- O SDK do Base44 lê/escreve direto nesse JSONB, então o campo held_balance
-- JÁ FUNCIONA sem migration (validado por teste: reserveBidBalance/releaseBidHold).
--
-- Esta migration NÃO é obrigatória para o funcionamento.
-- Serve apenas como documentação e para sincronizar o JSONB caso
-- existam carteiras antigas sem o campo held_balance.
-- ============================================================

-- 1. Garantir que todas as carteiras existentes tenham held_balance no JSONB
-- (carteiras criadas antes da mudança podem não ter o campo)
UPDATE public.digital_wallets
SET raw_base44 = jsonb_set(
  COALESCE(raw_base44, '{}'::jsonb),
  '{held_balance}',
  to_jsonb(COALESCE((raw_base44->>'held_balance')::numeric, 0))
)
WHERE raw_base44 IS NULL
   OR NOT raw_base44 ? 'held_balance';

-- 2. Garantir que transações antigas tenham related_auction_id e related_message_id
-- (já existem no JSONB das novas, mas antigas podem não ter)
-- Não precisa UPDATE — campos opcionais, o SDK lê como null naturalmente.

-- Pronto. Não há ALTER TABLE nem ALTER TYPE porque:
-- - Os campos são TEXT/NUMERIC dentro do JSONB (não enums físicos)
-- - O SDK do Base44 gerencia o JSONB automaticamente
-- - Adicionar colunas físicas não seria usado pelo SDK