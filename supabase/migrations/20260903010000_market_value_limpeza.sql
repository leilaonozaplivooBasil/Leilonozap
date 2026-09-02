-- ============================================================================
-- market_value: apagar o preço de referência que nenhuma pessoa digitou
-- ============================================================================
-- 02/09/2026. O dono, duas vezes: "os produtos das Ofertas Relâmpago estão
-- completamente fora de nexo" e, depois da primeira tentativa, "ainda há
-- valores 'REAIS' errados".
--
-- A primeira tentativa cortava por RAZÃO entre preços (teto de 90% de
-- desconto). Errado: razão responde "a diferença é grande?", e a pergunta era
-- "R$ 90,99 é preço crível para cola de PVC?". Nenhuma conta entre dois números
-- responde isso — por isso a cola passou com 89%.
--
-- O QUE O BANCO PROVOU — `market_value` nunca foi preço de ninguém:
--
--   a) 44 dos 262 valores ativos tinham TRÊS casas decimais:
--        Máscara PFF2 ....... "de R$ 68,645"
--        Luminária Arandela . "de R$ 26,465"
--      Nenhuma loja cobrou R$ 68,645. Três casas é assinatura de MÉDIA DE BUSCA.
--
--   b) 2.598 das 2.616 linhas vieram do pipeline automático de lote
--      (gerarProdutosDoLote <- searchMarket <- comparador de preços). A mesma
--      fonte que pôs foto de LAVAJATO numa torneira na loja.
--
--   c) das 18 restantes ("cadastro avulso"), 15 são exatamente
--      `price_catalog / 0,8` — a própria margem de 20%, não valor de mercado.
--      Anunciar "de R$ 85,39" quando o número É o seu preço dividido por 0,8 é
--      preço de referência inventado. CDC art. 37: publicidade enganosa.
--
--   d) não havia âncora para conferir: `cost_price` é o custo do LOTE rateado
--      (gerarProdutosDoLote.js:169), então roldana e sapatilha "custam" os
--      mesmos R$ 22,67.
--
-- NENHUMA das 2.616 linhas sobrevive a (a)+(b)+(c). Por isso o campo é zerado
-- por inteiro, e não por lista de linhas ruins — o Fone P2 já provou que lista
-- não segura: ele foi limpo com R$ 24,95, o PREÇO mudou para R$ 18,97 e o
-- desconto subiu sozinho para 97%.
--
-- O QUE MUDA NA LOJA: some o "de R$ X" riscado e o selo de %. Preço, estoque,
-- foto e o produto continuam iguais — nada sai de venda.
-- O QUE VOLTA: no dia em que uma PESSOA digitar um valor, o selo volta. Aí é
-- desconto de arremate de verdade, que o negócio tem.
--
-- REVERSÍVEL: nada é perdido, tudo vai para market_value_backup_20260902.
-- ============================================================================

-- 1) Fotografia completa antes de tocar em qualquer linha.
CREATE TABLE IF NOT EXISTS public.market_value_backup_20260902 (
  product_id     text PRIMARY KEY,
  description    text,
  market_value   numeric NOT NULL,
  price_catalog  numeric,
  cost_price     numeric,
  lot            text,
  catalog_active boolean,
  -- por que esta linha era suspeita, para quem for conferir depois
  motivo         text,
  salvo_em       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.market_value_backup_20260902 ENABLE ROW LEVEL SECURITY;
-- backup é dado interno: sem policy, só service_role enxerga.

INSERT INTO public.market_value_backup_20260902
  (product_id, description, market_value, price_catalog, cost_price, lot, catalog_active, motivo)
SELECT id, description, market_value, price_catalog, cost_price, lot, catalog_active,
       CASE
         WHEN market_value <> round(market_value, 2)                     THEN 'media_de_busca_3_casas'
         WHEN abs(market_value - price_catalog / 0.8) <= 0.01            THEN 'preco_dividido_por_0_8'
         WHEN coalesce(trim(lot), '') <> ''                              THEN 'pipeline_de_lote'
         ELSE 'origem_nao_humana'
       END
FROM public.products
WHERE market_value IS NOT NULL AND market_value > 0
ON CONFLICT (product_id) DO NOTHING;

-- 2) Zerar. NULL, não 0: "não existe preço de referência" é diferente de "zero".
UPDATE public.products
   SET market_value = NULL
 WHERE market_value IS NOT NULL AND market_value > 0;

-- 3) Conferência (roda junto, aparece no log da migração).
DO $$
DECLARE salvos int; sobraram int;
BEGIN
  SELECT count(*) INTO salvos   FROM public.market_value_backup_20260902;
  SELECT count(*) INTO sobraram FROM public.products WHERE market_value IS NOT NULL AND market_value > 0;
  RAISE NOTICE 'market_value: % linhas no backup, % ainda preenchidas', salvos, sobraram;
  IF sobraram > 0 THEN
    RAISE EXCEPTION 'limpeza incompleta: % linhas ainda com market_value', sobraram;
  END IF;
END $$;

-- ============================================================================
-- COMO DESFAZER (se precisar voltar tudo como estava):
--   UPDATE public.products p
--      SET market_value = b.market_value
--     FROM public.market_value_backup_20260902 b
--    WHERE p.id = b.product_id;
-- ============================================================================
