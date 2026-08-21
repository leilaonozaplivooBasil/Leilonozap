-- ⛔ NÃO APLICADO · TIPO: READ_ONLY · RISCO: ZERO
-- ════════════════════════════════════════════════════════════════════════════
-- AVALIAÇÃO DE DANO DO A14 — dois motores de encerramento correndo há 52 dias
-- ════════════════════════════════════════════════════════════════════════════
-- pg_cron roda `SELECT public.expire_auctions()` a cada minuto desde 30/06
-- (75.365 execuções). A Vercel roda `finalizeExpiredAuctions` também a cada
-- minuto. Os dois disputam o mesmo leilão, e só um liquida.
--
-- A ASSINATURA DO DANO
-- `submitAtomicBid.js:371` grava `winner_id` e `winner_name` a CADA lance. Então
-- um leilão com lance já chega ao fim com vencedor preenchido. Quem liquida de
-- verdade é `finalizeAuctionCore`, e é ele que grava `order_status` =
-- 'awaiting_payment' (linha 299), paga a comissão e devolve a reserva dos
-- perdedores. `expire_auctions()` não faz nada disso.
--
-- Logo: leilão COM lance, encerrado, com `order_status` VAZIO = foi o pg_cron
-- que chegou primeiro e a liquidação nunca aconteceu.
--
-- ⚠️ Isto é HIPÓTESE até o resultado sair. Existe explicação alternativa:
-- leilão reativado por `reactivateAuction.js` pode zerar campos. A consulta 3
-- separa os dois casos pelo histórico.

-- ── 1) O TAMANHO DO PROBLEMA ────────────────────────────────────────────────
SELECT '1. leiloes encerrados por faixa' AS bloco,
       a.status,
       CASE WHEN a.order_status IS NULL THEN 'order_status VAZIO' ELSE a.order_status END AS liquidacao,
       CASE WHEN a.winner_id IS NULL THEN 'sem vencedor' ELSE 'com vencedor' END AS vencedor,
       count(*) AS quantos
FROM public.auctions a
WHERE a.status IN ('ended','sold','finished','encerrado')
GROUP BY 1,2,3,4
ORDER BY quantos DESC;

-- ── 2) OS CASOS SUSPEITOS, UM A UM ──────────────────────────────────────────
-- Leilão com lance de verdade, encerrado, e sem sinal de liquidação.
SELECT '2. suspeito de nao ter liquidado' AS bloco,
       a.id, a.title, a.status, a.order_status, a.end_time,
       a.winner_id IS NOT NULL AS tem_vencedor,
       (SELECT count(*) FROM public.auction_messages m
         WHERE m.auction_id = a.id AND m.message_type = 'bid') AS lances,
       a.current_price
FROM public.auctions a
WHERE a.status IN ('ended','sold','finished','encerrado')
  AND a.order_status IS NULL
  AND EXISTS (SELECT 1 FROM public.auction_messages m
               WHERE m.auction_id = a.id AND m.message_type = 'bid')
ORDER BY a.end_time DESC
LIMIT 200;

-- ── 3) SEPARA "pg_cron chegou primeiro" DE "leilao reativado" ───────────────
-- Se o leilão foi reativado, existe registro em system_logs ou o end_time foi
-- alterado depois do último lance. Ajuda a não acusar o que não é.
SELECT '3. ultimo lance x fim previsto' AS bloco,
       a.id, a.end_time,
       (SELECT max(m.created_date) FROM public.auction_messages m
         WHERE m.auction_id = a.id AND m.message_type = 'bid') AS ultimo_lance,
       CASE
         WHEN (SELECT max(m.created_date) FROM public.auction_messages m
                WHERE m.auction_id = a.id AND m.message_type = 'bid') < a.end_time - interval '2 days'
           THEN 'provavel leilao reativado (lance muito antigo)'
         ELSE 'lance recente — suspeito de A14'
       END AS leitura
FROM public.auctions a
WHERE a.status IN ('ended','sold','finished','encerrado')
  AND a.order_status IS NULL
  AND EXISTS (SELECT 1 FROM public.auction_messages m
               WHERE m.auction_id = a.id AND m.message_type = 'bid')
ORDER BY a.end_time DESC
LIMIT 200;

-- ── 4) DINHEIRO PRESO — o que mais importa ─────────────────────────────────
-- Reserva que entrou e nunca saiu, em leilão que já encerrou. Se isto vier
-- com linhas, tem participante com saldo travado agora.
SELECT '4. reserva presa' AS bloco,
       l.auction_id, l.user_id,
       sum(CASE WHEN l.direcao = 'saida' OR l.tipo LIKE 'retencao%' THEN l.valor ELSE 0 END) AS reteve,
       sum(CASE WHEN l.direcao = 'entrada' OR l.tipo LIKE 'devolucao%' THEN l.valor ELSE 0 END) AS devolveu,
       a.status, a.order_status, a.end_time
FROM public.reserva_ledger l
JOIN public.auctions a ON a.id = l.auction_id
WHERE a.status IN ('ended','sold','finished','encerrado')
GROUP BY l.auction_id, l.user_id, a.status, a.order_status, a.end_time
HAVING sum(CASE WHEN l.direcao = 'saida' OR l.tipo LIKE 'retencao%' THEN l.valor ELSE 0 END)
     > sum(CASE WHEN l.direcao = 'entrada' OR l.tipo LIKE 'devolucao%' THEN l.valor ELSE 0 END)
ORDER BY a.end_time DESC
LIMIT 200;

-- ── 5) O JOB DO pg_cron E O HISTORICO ──────────────────────────────────────
SELECT '5. job do pg_cron' AS bloco, j.jobid::text, j.jobname, j.schedule, j.active::text, j.command
FROM cron.job j
WHERE j.command ILIKE '%expire_auctions%';

SELECT '6. execucoes por dia (ultimos 15)' AS bloco,
       date_trunc('day', r.start_time)::date::text AS dia,
       count(*) AS execucoes,
       count(*) FILTER (WHERE r.status <> 'succeeded') AS falhas
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE j.command ILIKE '%expire_auctions%'
GROUP BY 1 ORDER BY 1 DESC LIMIT 15;
