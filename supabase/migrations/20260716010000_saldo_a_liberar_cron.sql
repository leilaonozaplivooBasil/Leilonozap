-- ══════════════════════════════════════════════════════════════════════════
-- CRON de liberação — roda DEPOIS do bloco principal (20260716_saldo_a_liberar.sql).
-- Libera automático os saldos que já passaram do prazo (PIX 7d / cartão 14d).
-- Se der erro em pg_cron, o resto do sistema segue funcionando; a liberação
-- antecipada por confirmação do comprador não depende disto.
-- ══════════════════════════════════════════════════════════════════════════
create extension if not exists pg_cron;

-- remove agendamento anterior (se re-rodar) e agenda a cada 15 min
select cron.unschedule('liberar-saldos') where exists (select 1 from cron.job where jobname='liberar-saldos');
select cron.schedule('liberar-saldos', '*/15 * * * *', $$select public.liberar_saldos_maturados();$$);
