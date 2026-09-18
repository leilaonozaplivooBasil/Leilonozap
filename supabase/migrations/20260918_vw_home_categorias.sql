-- 🗂️ HOME NOVA — a conta por categoria da seção "Explore por categoria".
--
-- ⚠️ NÃO APLICADA. Este arquivo acompanha o preview da home nova (/HomeNova) e
-- só roda com autorização do dono, junto do merge da página.
--
-- POR QUE UMA VIEW
-- O card precisa de "quantos leilões ativos e quantos produtos na loja" por
-- categoria. PostgREST não agrupa, então sem a view a tela teria de baixar
-- milhares de produtos para contar no navegador.
--
-- POR QUE PELA CATEGORIA DO PRODUTO
-- `auctions.category` é herança do Base44: texto livre, 11 valores, e 52% dos
-- leilões ativos caem em "outros" — daria um card "Outros — 29" no lugar da
-- vitrine. Já `products.category_id` aponta para a árvore real de `categories`,
-- e 54 dos 55 leilões ativos têm produto com categoria. A conta sobe para a
-- categoria-mãe, que é o nível que o cliente reconhece ("Eletrônicos", não
-- "Cabo HDMI").

-- 1) Imagem da categoria: a tabela não tem nenhuma coluna de mídia hoje.
--    Aditiva e anulável — categoria sem foto cai no bloco de cor com a inicial.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS image_url text;

-- 2) A view.
CREATE OR REPLACE VIEW public.vw_home_categorias
WITH (security_invoker = on) AS
WITH raiz AS (
  SELECT c.id AS cat_id,
         COALESCE(c.parent_category_id, c.id) AS raiz_id
  FROM public.categories c
)
SELECT m.id                                                            AS id,
       m.name                                                          AS nome,
       m.image_url                                                     AS imagem,
       count(DISTINCT a.id) FILTER (
         WHERE a.status = 'active' AND a.end_time > now()
       )                                                               AS leiloes_ativos,
       count(DISTINCT p.id) FILTER (WHERE p.catalog_active)            AS produtos_na_loja
FROM public.categories m
JOIN raiz               ON raiz.raiz_id = m.id
JOIN public.products p  ON p.category_id = raiz.cat_id
LEFT JOIN public.auctions a ON a.product_id = p.id
WHERE m.parent_category_id IS NULL
  AND m.is_active
GROUP BY m.id, m.name, m.image_url;

-- 3) A home é pública: quem não tem conta precisa ler.
--    `security_invoker` mantém a RLS de products/auctions valendo — a view não
--    é uma porta dos fundos para linha que o anônimo não poderia ver.
GRANT SELECT ON public.vw_home_categorias TO anon, authenticated;

COMMENT ON VIEW public.vw_home_categorias IS
  'Contagem por categoria-mãe para a home: leilões ativos e produtos na loja. O leilão herda a categoria do produto ligado (auctions.category é herança do Base44 e não serve de vitrine).';
