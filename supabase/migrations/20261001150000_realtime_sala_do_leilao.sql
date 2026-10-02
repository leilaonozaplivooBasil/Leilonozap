-- 📡 01/10/2026 — LIGA O TEMPO REAL DA SALA DO LEILÃO.
--
-- A publicação `supabase_realtime` estava VAZIA (zero tabelas, zero assinaturas
-- ativas). O código assinava `auctions` e `auction_messages` em sete telas e
-- nunca recebia nada: o "VENDIDO" do leiloeiro, o lance de outra pessoa e a
-- mensagem do chat só chegavam pela consulta periódica (15 s e 60 s).
--
-- Com as duas tabelas na publicação, cada mudança chega a quem está na sala em
-- frações de segundo. A leitura continua protegida pela política `public_read`
-- (as duas tabelas já eram públicas para leitura); o realtime respeita RLS.
--
-- Idempotente: só adiciona o que ainda não está lá.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'auctions'
  ) then
    alter publication supabase_realtime add table public.auctions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'auction_messages'
  ) then
    alter publication supabase_realtime add table public.auction_messages;
  end if;
end $$;
