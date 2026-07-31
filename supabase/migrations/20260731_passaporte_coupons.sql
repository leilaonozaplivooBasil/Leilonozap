-- ============================================================================
-- CUPOM PASSAPORTE — 10% do valor aportado, liberado só para quem disputou e perdeu
-- ============================================================================
-- Regras (fechadas com o Gabriel em 31/07/2026):
--  • valor_credito = 10% do valor depositado, em REAIS (crédito, não percentual)
--  • sem teto: pode abater até 100% do pedido; o que sobra fica em saldo_restante
--  • sem validade: nunca expira
--  • único por depósito (origin_sale_id UNIQUE = idempotência do webhook)
--  • nasce 'bloqueado'; vira 'liberado' quando o usuário deu lance e foi superado;
--    vira 'cancelado' se ele arrematou (o aporte virou compra)
-- Tabela DEDICADA: a tabela `coupons` e a RPC `aplicar_cupom` continuam intocadas.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.passaporte_coupons (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          text        NOT NULL,
  origin_sale_id   text        NOT NULL UNIQUE,
  valor_aportado   numeric(12,2) NOT NULL DEFAULT 0,
  pct              numeric(5,2)  NOT NULL DEFAULT 10,
  valor_credito    numeric(12,2) NOT NULL DEFAULT 0,
  saldo_restante   numeric(12,2) NOT NULL DEFAULT 0,
  status           text        NOT NULL DEFAULT 'bloqueado',
  liberado_em      timestamptz,
  primeiro_uso_em  timestamptz,
  auction_id_disputado text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT passaporte_coupons_status_chk
    CHECK (status IN ('bloqueado', 'liberado', 'usado', 'cancelado'))
);

CREATE INDEX IF NOT EXISTS passaporte_coupons_user_status_idx
  ON public.passaporte_coupons (user_id, status);

-- Acesso somente via service role (endpoints do servidor). Nenhuma policy = nenhum
-- acesso anônimo/autenticado direto: o desconto nunca pode ser manipulado pelo front.
ALTER TABLE public.passaporte_coupons ENABLE ROW LEVEL SECURITY;