-- ⛔ NÃO APLICADO · TIPO: WRITE_PRODUCTION · RISCO: BAIXO
-- Religa o job do pg_cron. Use se os leilões pararem de encerrar depois do 02b —
-- ou seja, se o cron da Vercel não estiver dando conta sozinho.
--
-- ⚠️ Religar traz de volta o defeito A14. É medida de emergência para o sistema
-- não ficar sem motor nenhum, não é solução.
UPDATE cron.job SET active = true
WHERE command ILIKE '%expire_auctions%';

SELECT jobid, jobname, schedule, active FROM cron.job WHERE command ILIKE '%expire_auctions%';

-- Se o job tiver sido APAGADO em vez de desativado, recrie com o snapshot do
-- PASSO 1 do 02b:
--   SELECT cron.schedule('expire-auctions', '* * * * *', 'SELECT public.expire_auctions();');
