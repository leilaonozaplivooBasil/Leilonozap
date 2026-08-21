-- ⛔ NÃO APLICADO · TIPO: WRITE_PRODUCTION · RISCO: MÉDIO
-- ════════════════════════════════════════════════════════════════════════════
-- DESLIGA O SEGUNDO MOTOR DE ENCERRAMENTO
-- ════════════════════════════════════════════════════════════════════════════
-- ⚠️ ESTE SCRIPT VEM ANTES DO 02_revogar_9_rpcs.sql. A ordem importa.
--
-- Revogar o EXECUTE sem desligar o job só piora: o pg_cron roda com o dono do
-- job, que provavelmente não perde a permissão — então o segundo motor
-- continuaria rodando, e a gente teria fechado a porta de entrada errada
-- achando que resolveu.
--
-- O QUE ESTE JOB FAZ HOJE: `SELECT public.expire_auctions()` a cada minuto,
-- desde 30/06, 75.365 execuções. Ele tira o leilão de `active` SEM definir
-- order_status, SEM pagar comissão e SEM devolver a reserva dos perdedores.
-- Quem faz tudo isso é `api/functions/finalizeExpiredAuctions.js`, que também
-- roda a cada minuto (vercel.json:28) e que PERDE o leilão quando o pg_cron
-- chega primeiro, porque filtra por `status in (active,processing)`.
--
-- ⚠️ ANTES DE RODAR: execute `00_dano_A14_leitura.sql` e guarde o resultado.
-- Depois de desligar o job, o padrão muda e não dá mais pra medir o que passou.
--
-- ⚠️ DEPOIS DE RODAR: acompanhe por 30 minutos que os leilões continuam
-- encerrando. Quem passa a encerrar sozinho é o cron da Vercel. Se ele estiver
-- com problema, os leilões param de encerrar — por isso a verificação abaixo
-- confere se houve encerramento recente ANTES de desligar.

-- ── PASSO 1 — SNAPSHOT: guarde esta saída, é o rollback ─────────────────────
SELECT 'GUARDE ESTA LINHA' AS aviso,
       jobid, jobname, schedule, command, nodename, nodeport, database, username, active
FROM cron.job
WHERE command ILIKE '%expire_auctions%';

-- ── PASSO 2 — o cron da Vercel está vivo? ──────────────────────────────────
-- Se NENHUM leilão encerrou nas últimas 2 horas, algo pode estar errado com a
-- Vercel e desligar o pg_cron deixaria o sistema sem NENHUM motor.
SELECT 'leiloes encerrados nas ultimas 2h' AS conferencia, count(*) AS quantos
FROM public.auctions
WHERE status IN ('ended','sold')
  AND COALESCE(updated_date, updated_at, last_updated) > now() - interval '2 hours';
-- Esperado: > 0 se houver leilão vencendo nesse período.
-- Se vier 0 e houver leilão com end_time vencido, PARE e investigue a Vercel.

-- ── PASSO 3 — desliga (não apaga) ──────────────────────────────────────────
-- `active = false` mantém o job cadastrado. Reativar é um UPDATE.
-- Preferido a `cron.unschedule()`, que apaga o registro e exige recriar do zero.
UPDATE cron.job SET active = false
WHERE command ILIKE '%expire_auctions%';

-- ── PASSO 4 — confirma ─────────────────────────────────────────────────────
SELECT jobid, jobname, schedule, active AS ainda_ativo
FROM cron.job
WHERE command ILIKE '%expire_auctions%';
-- Esperado: ainda_ativo = false.
