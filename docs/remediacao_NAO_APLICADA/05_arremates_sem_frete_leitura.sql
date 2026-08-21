-- ⛔ NÃO APLICADO · TIPO: READ_ONLY · RISCO: ZERO
-- Quantos arremates existem hoje sem frete e sem delivery_type, e quanto de
-- frete a empresa pagou do próprio bolso.
SELECT '1. arremates por situacao' AS bloco,
       COALESCE(s.raw_base44 ->> 'delivery_type', '(vazio)') AS delivery_type,
       CASE WHEN COALESCE((s.raw_base44 -> 'frete' ->> 'valor')::numeric, 0) > 0
            THEN 'com frete' ELSE 'SEM FRETE' END AS frete,
       count(*) AS quantos,
       round(sum(COALESCE((s.raw_base44 -> 'frete' ->> 'valor')::numeric, 0)), 2) AS soma_frete
FROM public.catalog_sales s
WHERE s.kind = 'arremate'
GROUP BY 1,2,3 ORDER BY quantos DESC;

SELECT '2. arremates SEM frete, um a um' AS bloco,
       s.id, s.tracking_code, s.product_title, s.buyer_name, s.total_amount, s.status, s.created_date,
       COALESCE(s.raw_base44 ->> 'delivery_type', '(vazio)') AS delivery_type,
       (SELECT a.frete_reservado_valor FROM public.auctions a
         WHERE a.winner_id = s.buyer_id AND a.title = replace(s.product_title, 'Arremate — ', '')
         LIMIT 1) AS frete_que_estava_no_leilao
FROM public.catalog_sales s
WHERE s.kind = 'arremate'
  AND COALESCE((s.raw_base44 -> 'frete' ->> 'valor')::numeric, 0) = 0
ORDER BY s.created_date DESC LIMIT 200;

SELECT '3. leiloes encerrados com frete_reservado_valor ZERO' AS bloco,
       count(*) FILTER (WHERE COALESCE(a.frete_reservado_valor, 0) = 0) AS sem_frete,
       count(*) FILTER (WHERE COALESCE(a.frete_reservado_valor, 0) > 0) AS com_frete,
       count(*) AS total
FROM public.auctions a
WHERE a.status IN ('ended','sold') AND a.winner_id IS NOT NULL;
