-- ⏪ PONTO DE RETORNO — 17/09/2026
--
-- O dono mandou seis leilões encerrarem AMANHÃ 18/09/2026 às 17h00 BRT.
-- Os seis nasceram em 16/09 com 72h de duração (o pedido na tela era 48h) e
-- estavam marcados pra 19/09. A Beatriz reclamou do prazo; a decisão foi
-- antecipar, não deixar correr.
--
-- Este arquivo desfaz EXATAMENTE isso: devolve o end_time original de cada um,
-- milissegundo a milissegundo, como estava antes do UPDATE.
--
-- Estado no momento da mudança (medido, não estimado):
--   - 5 dos 6 sem NENHUM lance
--   - 1 (Couro Impermeável Luxo) com 1 lance de R$ 53,60, de 1 pessoa, em
--     16/09 15:53 — no próprio valor de abertura
--   - nenhum com comissão distribuída, nenhum em modo_chamada
--
-- Se rodar isto DEPOIS de 18/09 17h, os leilões já terão sido arrematados pelo
-- cron (finalizeExpiredAuctions) e voltar o end_time NÃO desfaz o arremate.
-- Conferir `status` e `winner_id` antes.

UPDATE public.auctions SET end_time = '2026-09-19 17:15:28.824+00' WHERE id = 'e72311712bcd173faf1ad5b7'; -- Relógio Automático Skeleton Transparente
UPDATE public.auctions SET end_time = '2026-09-19 17:17:00+00'     WHERE id = 'd8c11b27e57fb7d3fbf4aa4b'; -- Relógio Couro Impermeável Luxo (tem 1 lance)
UPDATE public.auctions SET end_time = '2026-09-19 17:18:52.801+00' WHERE id = '31b4742128408a4155ac2ceb'; -- Relógios Quartzo Cronógrafo Quadrado ZXL
UPDATE public.auctions SET end_time = '2026-09-19 17:20:00.128+00' WHERE id = '0b80158c6c6671595a263abe'; -- Relógio Cronógrafo Fundo Azul Subdials
UPDATE public.auctions SET end_time = '2026-09-19 17:24:00+00'     WHERE id = 'f17539592fddbb672e7677d5'; -- Camiseta AR3 - Branca
UPDATE public.auctions SET end_time = '2026-09-19 22:40:17.076+00' WHERE id = '28ba4020ac69303dab9509bc'; -- Chinelo Papete Moleca
