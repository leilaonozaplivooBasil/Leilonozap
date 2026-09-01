-- 🏭 02/09/2026 — ORIGEM DO PRODUTO, PARA A LOJA VIRTUAL TER AS PÍLULAS DO LEILÃO.
--
-- A área de leilão filtra por "Direto de Fábrica" e "Arremate & Devoluções" usando
-- auctions.product_source. A Loja Virtual vende `products`, e essa coluna não existia
-- lá — não era um filtro que faltava na tela, era o dado que não existia.
--
-- Mesmo nome e mesmos valores de auctions.product_source, de propósito.
--
-- SEM DEFAULT, e sem preenchimento automático: os 4 lotes que concentram 90% da base
-- misturam fábrica e devolução (confirmado pela operação em 02/09), então classificar
-- por lote marcaria produto errado. Anunciar devolução como "Direto de Fábrica" é a
-- promessa que gera exatamente a reclamação que este trabalho está tentando parar.
-- Fica NULL até alguém informar, e a pílula só aparece quando houver produto nela.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_source TEXT;

COMMENT ON COLUMN public.products.product_source IS
  'Origem do produto: factory_new (novo de fábrica) ou return_resale (arremate/devolução). Mesmos valores de auctions.product_source. NULL = não informado. Ver src/lib/origemProduto.js.';

CREATE INDEX IF NOT EXISTS idx_products_product_source
  ON public.products (product_source) WHERE product_source IS NOT NULL;
