-- PONTO 84 — completa a migração 20260801_frete_leilao.sql, que entrou PELA METADE:
-- criou auctions.frete_reservado_valor, NÃO criou auction_messages.frete_amount.
-- A ausência desta coluna fez TODO lance falhar (PostgREST 42703) de 03/08 15:03 até
-- a correção do PONTO 83, que removeu o campo do INSERT.
--
-- ⚠️ ORDEM OBRIGATÓRIA — NÃO INVERTER:
--   1) rodar este ALTER TABLE aqui no Supabase;
--   2) SÓ DEPOIS reintroduzir `frete_amount` no INSERT de api/functions/submitAtomicBid.js
--      (removendo o comentário-trava) e trocar, em api/functions/getDigitalWalletHistory.js,
--      o frete lido de auctions.frete_reservado_valor por Number(m.frete_amount).
-- Inverter a ordem é exatamente o que parou os lances por 12 horas.
--
-- Enquanto esta coluna não existir, o extrato mostra o frete apenas no lance que está
-- liderando (fonte: auctions.frete_reservado_valor). Com ela, o frete passa a valer
-- lance por lance, inclusive no histórico de lances já superados.

ALTER TABLE auction_messages
  ADD COLUMN IF NOT EXISTS frete_amount numeric DEFAULT 0;