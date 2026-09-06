-- PONTO 68 — Passaporte de Lances: bônus de 10% CREDITADO NA HORA (modelo A)
--
-- Antes: depósito de R$ 100 creditava R$ 100 e criava um cupom BLOQUEADO de R$ 10,
-- liberado só se o usuário perdesse o arremate.
-- Agora: o depósito credita R$ 110 direto na carteira. Se o usuário ARREMATAR, o
-- bônus de R$ 10 é recolhido do saldo disponível (nunca deixa saldo negativo).
--
-- Esta migração NÃO apaga nem invalida cupons antigos: eles continuam válidos e
-- utilizáveis no carrinho pelo motor existente.

-- 1) Registro do bônus creditado (auditoria + base do recolhimento)
ALTER TABLE public.passaporte_coupons
  ADD COLUMN IF NOT EXISTS bonus_creditado_em timestamptz,
  ADD COLUMN IF NOT EXISTS bonus_recolhido_em timestamptz,
  ADD COLUMN IF NOT EXISTS bonus_recolhido_valor numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auction_id_arrematado text;

-- 2) Liberar os novos estados de status ('creditado' e 'recolhido'), preservando os antigos
DO $$
DECLARE
  c_name text;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'public.passaporte_coupons'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';

  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.passaporte_coupons DROP CONSTRAINT %I', c_name);
  END IF;

  ALTER TABLE public.passaporte_coupons
    ADD CONSTRAINT passaporte_coupons_status_chk
    CHECK (status IN ('bloqueado', 'liberado', 'usado', 'cancelado', 'creditado', 'recolhido'));
END $$;

-- 3) Trilha de aceite ESPECÍFICA do Passaporte (não sobrescreve o Termo de Adesão geral)
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS passaporte_terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS passaporte_terms_version text;

COMMENT ON COLUMN public.app_users.passaporte_terms_accepted_at IS 'Data/hora do aceite dos termos do Passaporte de Lances (obrigatório antes do 1o depósito)';
COMMENT ON COLUMN public.passaporte_coupons.bonus_recolhido_valor IS 'Valor do bônus de 10% recolhido do saldo por ter arrematado';