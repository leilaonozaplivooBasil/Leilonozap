-- 🏷️ 02/09/2026 — A CONDIÇÃO JÁ ESTAVA NO BANCO. NINGUÉM TINHA LIDO.
--
-- A migração de hoje mais cedo (20260902090000) tentou recuperar a grade do
-- marcador [grade:X] dentro de `notes` e trouxe ZERO linhas — o marcador só
-- passou a ser escrito há pouco, e existem 6 produtos com ele na base inteira.
--
-- A fonte certa sempre foram os contadores. `gerarProdutosDoLote` distribui a
-- grade da planilha entre qty_perfeito / qty_bom / qty_ruim / qty_oficina desde
-- que o gerador existe. Ou seja: a classificação de cada produto está gravada,
-- só nunca virou informação para o cliente.
--
--   A     → qty_perfeito → perfeito
--   B, C  → qty_bom      → bom
--   D, E  → qty_ruim     → com_avarias
--   U     → qty_oficina  → para_reparo
--
-- ⚠️ ESSA INFORMAÇÃO ESTRAGA. O contador é o SALDO ATUAL por grade: quando o
-- produto vende, a baixa zera o contador e a grade dele se perde. Por isso 1.538
-- produtos já estavam sem contador nenhum. Depois de copiada para `condicao`,
-- a informação para de estragar.
--
-- Só escreve onde:
--   · condicao ainda está NULL (não sobrescreve nada preenchido à mão), e
--   · existe EXATAMENTE UM contador ativo (os 13 ambíguos ficam de fora)
--
-- Aplicada em produção em 02/09/2026 pelo conector, com autorização do dono.
-- Resultado medido: 1.380 produtos preenchidos, 289 deles na vitrine (eram 1).
-- É idempotente — rodar de novo não muda nada.

UPDATE public.products p
   SET condicao = a.nova
  FROM (
    SELECT id,
      CASE
        WHEN coalesce(qty_perfeito,0) > 0 THEN 'perfeito'
        WHEN coalesce(qty_bom,0)      > 0 THEN 'bom'
        WHEN coalesce(qty_ruim,0)     > 0 THEN 'com_avarias'
        WHEN coalesce(qty_oficina,0)  > 0 THEN 'para_reparo'
      END AS nova
    FROM public.products
    WHERE condicao IS NULL
      AND ( (coalesce(qty_perfeito,0) > 0)::int
          + (coalesce(qty_bom,0)      > 0)::int
          + (coalesce(qty_ruim,0)     > 0)::int
          + (coalesce(qty_oficina,0)  > 0)::int ) = 1
  ) a
 WHERE p.id = a.id;
