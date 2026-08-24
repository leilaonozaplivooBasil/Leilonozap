-- catalog_sales.buyer_cpf — a coluna que o código grava e lê há dias, e que não existia.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- O QUE ACONTECEU (24/08/2026)
-- ══════════════════════════════════════════════════════════════════════════════
-- settleAuctionWithBalance.js manda `buyer_cpf` no insert de catalog_sales desde
-- o PR #74 (21/08). A coluna nunca existiu. O PostgREST recusa o insert inteiro
-- quando aparece coluna desconhecida — e o código não conferia a resposta.
--
-- Resultado, no arremate pago com saldo:
--   • o leilão virava 'paid'
--   • o saldo do cliente era DEBITADO (com linha no reserva_ledger)
--   • e NENHUM pedido nascia em catalog_sales
--
-- Quatro clientes, R$ 37,40, na primeira execução do cron de liquidação:
--   Rosenberg de Oliveira  R$  1,60  Kit 10 Driver Reator Led
--   Lucas Arruda           R$  1,80  Organizador de Mesa Triplo
--   LUCIANO PINHEIRO       R$ 12,40  Sapato Segurança EPI
--   LUIZ SANTANNA          R$ 21,60  Kit 9 Mini Esponjas
--
-- ══════════════════════════════════════════════════════════════════════════════
-- POR QUE ADICIONAR A COLUNA, E NÃO TIRAR O CAMPO DO CÓDIGO
-- ══════════════════════════════════════════════════════════════════════════════
-- O CPF não é enfeite — três lugares LEEM ele:
--   • api/_lib/melhorEnvioShipment.js:323 — a Melhor Envio exige CPF do
--     destinatário para emitir etiqueta. Hoje ele só é achado se estiver dentro
--     do raw_base44; a coluna é o caminho direto.
--   • src/pages/LicenseeOrders.jsx:87   — busca de pedido por CPF
--   • src/pages/TransactionHistory.jsx:56 — busca de transação por CPF
--
-- Tirar o campo do insert resolveria o erro e quebraria a etiqueta e as duas
-- buscas. Adicionar a coluna é o que honra o que o código já espera.
--
-- E outras duas rotas também gravam neste campo e vinham falhando calado do mesmo
-- jeito: cobrarFretePendente.js (linhas 400 e 665). Esta migração conserta as três.
--
-- Nulável de propósito: venda antiga não tem CPF e não pode virar erro.
alter table public.catalog_sales
  add column if not exists buyer_cpf text;

comment on column public.catalog_sales.buyer_cpf is
  'CPF do comprador. Usado pela Melhor Envio (destinatario da etiqueta) e pelas buscas de LicenseeOrders/TransactionHistory. Criada em 24/08/2026 — o codigo gravava desde 21/08 numa coluna que nao existia, e o insert inteiro era recusado em silencio.';
