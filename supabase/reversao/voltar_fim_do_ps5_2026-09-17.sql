-- ⏪ PONTO DE RETORNO — 17/09/2026
--
-- O dono mandou o leilão do Playstation 5 encerrar no DOMINGO 20/09/2026 às
-- 18h00 BRT. Estava marcado pra 29/09 16:53 (30 dias de duração).
--
-- ⚠️ ESTE NÃO É COMO OS SEIS DE HOJE CEDO. O PS5 está DISPUTADO:
--     3 lances, de 3 pessoas diferentes
--     preço saiu de R$ 497,00 e está em R$ 597,00
--     último lance em 17/09 12:30 — duas horas antes desta mudança
--     líder no momento: winner_id 10ce1fd4f6aaf39b3342cc69
-- Antecipar corta NOVE dias de um leilão com gente disputando. Foi decisão do
-- dono, registrada aqui pra não virar dúvida depois.
--
-- Se rodar isto DEPOIS de 20/09 18h, o cron (finalizeExpiredAuctions) já terá
-- arrematado, e voltar o end_time NÃO desfaz o arremate. Conferir `status` e
-- `winner_id` antes.

UPDATE public.auctions SET end_time = '2026-09-29 19:53:00+00' WHERE id = 'bdd0d57913916ffae89f5664'; -- Playstation 5
