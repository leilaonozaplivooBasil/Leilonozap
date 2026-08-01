-- PONTO 67 — Trilha de auditoria do aceite do Termo de Adesão
-- Apenas ADICIONA duas colunas em app_users. Não altera nem remove nada existente.
-- (terms_accepted já existe na tabela.)

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text;

COMMENT ON COLUMN public.app_users.terms_accepted_at IS 'Data/hora do aceite do Termo de Adesão (prova jurídica)';
COMMENT ON COLUMN public.app_users.terms_version IS 'Versão do texto do Termo de Adesão aceito (ex: 2026-07-31)';