-- financial_expenses.payment_account — de qual conta o dinheiro saiu.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- POR QUE (28/08/2026, pedido do dono)
-- ══════════════════════════════════════════════════════════════════════════════
-- Na baixa de um gasto ("Dar Baixa no Pagamento") dava pra registrar COMO se pagou
-- (payment_method: PIX, boleto, dinheiro...) e um texto livre em pix_or_card_info
-- ("Ex: PIX Santander, Cartão Nubank..."), mas não DE QUAL CONTA o dinheiro saiu de
-- forma estruturada. Sem isso não existe relatório de saída por conta — texto livre
-- não agrupa: "Santander", "santander", "PIX Santander" e "Sant." são quatro coisas
-- diferentes pro banco.
--
-- Esta coluna guarda a conta escolhida numa lista fechada, ditada pelo dono:
--   Mercado Pago | Itaú | Santander | Bradesco | Espécie | Outros
--
-- Sem CHECK de propósito: a lista vive no front (PaymentModal.jsx) e o dono muda de
-- banco sem depender de migração. Um CHECK aqui transformaria "abrir conta nova" em
-- deploy de banco, e o custo de um valor fora da lista é zero (o campo é descritivo,
-- nada de dinheiro depende dele).
--
-- ADITIVA E SEGURA: gasto antigo fica com NULL, nada quebra, nenhum código existente
-- lê esta coluna hoje.
--
-- ⚠️ Rodar ANTES do deploy do front. api/functions/entityWrite.js usa writeResilient(),
-- que remove coluna inexistente e tenta de novo — ou seja, sem esta migração a baixa
-- CONTINUA funcionando, mas a conta escolhida é descartada em silêncio.

ALTER TABLE public.financial_expenses
  ADD COLUMN IF NOT EXISTS payment_account TEXT;

COMMENT ON COLUMN public.financial_expenses.payment_account IS
  'Conta de onde saiu o pagamento (Mercado Pago, Itaú, Santander, Bradesco, Espécie, Outros). Preenchido na baixa do pagamento.';
