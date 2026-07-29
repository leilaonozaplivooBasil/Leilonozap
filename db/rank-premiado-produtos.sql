-- ============================================================================
-- RANK PREMIADO — VITRINE DE PRODUTOS DA LOJA NOS PRÊMIOS
-- Adiciona foto, preço e link da loja em cada posição do pódio (1º, 2º, 3º)
-- e no prêmio do dia, transformando o concurso num canal de divulgação.
-- Rodar no SQL Editor do Supabase (produção leilaonozap.net).
-- ============================================================================

-- PARTE 1 — Prêmios do pódio (concurso_premios): foto + preço + link da loja
alter table concurso_premios add column if not exists produto_foto text;
alter table concurso_premios add column if not exists produto_valor numeric default 0;
alter table concurso_premios add column if not exists produto_link text;

-- PARTE 2 — Prêmio do dia (concurso_config): link do produto na loja
alter table concurso_config add column if not exists produto_link text;