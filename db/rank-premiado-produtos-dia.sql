-- Rank Premiado — Sorteio do dia com 3 produtos (1º/2º/3º produto do dia)
-- Adiciona a coluna produtos_dia (jsonb) na concurso_config pra guardar os 3 produtos
-- que o admin configura na aba "Sorteio do dia" e que aparecem como cards clicáveis
-- na vitrine pública do Rank Premiado.
--
-- RODAR no editor SQL do Supabase (Dashboard → SQL Editor → New query → colar → Run).

ALTER TABLE concurso_config
  ADD COLUMN IF NOT EXISTS produtos_dia jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN concurso_config.produtos_dia IS
  'Array de 3 produtos do sorteio do dia: [{nome, foto, valor, link}, ...]. Editados no painel admin (aba Sorteio do dia) e exibidos na vitrine pública (PrizeShowcase).';