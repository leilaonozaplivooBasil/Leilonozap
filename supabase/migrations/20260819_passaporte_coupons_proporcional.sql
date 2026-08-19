-- 🎟️ LIBERAÇÃO PROPORCIONAL DO CUPOM PASSAPORTE (19/08/2026) — autorizado pelo dono.
--
-- POR QUE EXISTE:
-- A versão anterior liberava o cupom BLOQUEADO INTEIRO na primeira vez que o
-- usuário fosse superado em QUALQUER leilão, não importa quão pequeno o lance.
-- Isso abria uma fraude óbvia: depositar R$100 (ganhando R$10 de bônus), dar um
-- lance de R$1 num leilão perdido de propósito, e destravar o bônus de R$10
-- inteiro pra Loja Virtual — sem nunca ter realmente arriscado o depósito.
--
-- REGRA OFICIAL CORRIGIDA: cada leilão libera (se perder) ou cancela (se ganhar)
-- só 10% do LANCE dado NAQUELE leilão — não 10% do depósito inteiro. Quem dividir
-- o depósito em vários lances, em vários leilões que terminam em datas diferentes,
-- recebe o bônus em fatias, conforme cada leilão se resolve.
--
-- Isso exige rastrear, por cupom, quanto já foi liberado e quanto já foi
-- cancelado — o cupom deixa de ser "tudo ou nada" (status único) e passa a ter
-- um saldo bloqueado que vai sendo consumido aos poucos.

ALTER TABLE public.passaporte_coupons
  ADD COLUMN IF NOT EXISTS valor_liberado  numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_cancelado numeric(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.passaporte_coupons.valor_liberado IS
  'Soma cumulativa já liberada pra Loja Virtual, fatia por fatia, conforme os leilões disputados terminam sem o usuário ganhar.';
COMMENT ON COLUMN public.passaporte_coupons.valor_cancelado IS
  'Soma cumulativa cancelada porque a fatia correspondente do lance venceu o leilão (virou compra).';

-- 🩹 Corrige cupons nascidos sob o bug anterior (saldo_restante = valor_credito
-- inteiro já no ato da criação, mesmo ainda bloqueado). Nenhum cupom BLOQUEADO
-- pode ter saldo gastável — só depois de liberado de verdade.
UPDATE public.passaporte_coupons SET saldo_restante = 0 WHERE status = 'bloqueado';
