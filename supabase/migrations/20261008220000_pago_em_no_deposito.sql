-- 🛡️ DIR-211b (08/10/2026) — pago_em: o carimbo do PAGAMENTO na venda
--
-- A régua do antifraude mede "3º depósito em 24h" e "depósitos pagos há mais de 7 dias".
-- Até aqui o único relógio disponível era created_date — que é a hora em que o QR nasceu,
-- não a hora em que foi pago. Quem gera três QR hoje e paga os três amanhã escapava da
-- sequência; quem paga QR velhos fabricava "histórico". A revisão adversarial da DIR-211
-- apontou; a correção é medir pelo pagamento: o flip do webhook grava pago_em, e a
-- leitura do contexto usa pago_em (segurados: antifraude_avaliado_em; linhas antigas sem
-- carimbo: created_date como fallback). Coluna aditiva, sem backfill — a janela é de 24h.
alter table public.catalog_sales add column if not exists pago_em timestamptz;
comment on column public.catalog_sales.pago_em is 'DIR-211b: quando o webhook virou a venda para paid (o momento do pagamento). Nulo nas vendas pagas antes de 08/10/2026.';
