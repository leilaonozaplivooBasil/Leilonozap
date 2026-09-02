-- 🧹 02/09/2026 — CATEGORIA SEM PRODUTO NÃO PODE SER OFERECIDA NA VITRINE.
--
-- "COSTURA" e "Escritório" apareciam na fileira de categorias da Loja Virtual
-- com ZERO produtos: o cliente clicava e caía numa vitrine vazia. Relatado com
-- print em 02/09 (o COSTURA também estava em caixa alta — nome já corrigido).
--
-- POR QUE UMA VIEW, E NÃO CONTAR NO NAVEGADOR: a loja carrega 240 produtos por
-- vez. Contar pelo que está carregado esconderia categoria cujos itens estão
-- fora dessa janela, e o sintoma seria pior que o problema — "sumiu uma
-- categoria que tem produto". A view conta a base inteira, no servidor.
--
-- Só leitura, e só de contagem: nenhum dado novo é exposto além do que a loja
-- já lê de categories e products.
--
-- Aplicada em produção em 02/09/2026 pelo conector, com autorização do dono.

CREATE OR REPLACE VIEW public.vw_categorias_vitrine AS
SELECT c.id, c.name, c.parent_category_id, c.is_active, c.sort_order,
       count(p.id) FILTER (WHERE p.catalog_active) AS produtos_na_loja,
       count(p.id)                                 AS produtos_total
FROM public.categories c
LEFT JOIN public.products p ON p.category_id = c.id
GROUP BY c.id, c.name, c.parent_category_id, c.is_active, c.sort_order;

GRANT SELECT ON public.vw_categorias_vitrine TO anon, authenticated;

COMMENT ON VIEW public.vw_categorias_vitrine IS
  'Categorias com a contagem de produtos (total e ativos na loja). A Loja Virtual usa produtos_na_loja > 0 para não oferecer categoria que abre vitrine vazia.';
