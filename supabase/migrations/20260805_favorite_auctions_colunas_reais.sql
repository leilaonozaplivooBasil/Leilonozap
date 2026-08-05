-- ============================================================================
-- PONTO 89 — 🔴 TABELA CASCA: favorite_auctions
--
-- PROBLEMA ENCONTRADO EM 05/08/2026 (auditoria de leitura):
-- A tabela `favorite_auctions` existe na Supabase, mas veio da migração APENAS
-- com o esqueleto (id, base44_id, raw_base44, created_at, updated_at).
-- As colunas `user_id`, `auction_id` e `context` NUNCA foram criadas.
--
-- CONSEQUÊNCIA REAL: o botão "❤️ Favoritar" do leilão NÃO consegue gravar —
-- a tabela tem 0 registros e qualquer INSERT com user_id falha com
-- "column favorite_auctions.user_id does not exist" (erro 42703, comprovado).
-- Por consequência, o lembrete de 24h nunca encontra favorito nenhum.
--
-- NATUREZA DESTA MIGRAÇÃO: 100% ADITIVA.
-- • Só ADICIONA colunas que faltam (IF NOT EXISTS).
-- • NÃO altera coluna existente, NÃO remove nada, NÃO apaga registro.
-- • A tabela está VAZIA (0 linhas) — risco de conflito com dado real: zero.
--
-- COMO APLICAR: colar no SQL Editor da Supabase e executar.
-- ============================================================================

ALTER TABLE public.favorite_auctions
  ADD COLUMN IF NOT EXISTS user_id    text,
  ADD COLUMN IF NOT EXISTS auction_id text,
  ADD COLUMN IF NOT EXISTS context    text DEFAULT 'nozap';

-- Busca rápida por usuário e por leilão (o lembrete de 24h filtra por auction_id)
CREATE INDEX IF NOT EXISTS favorite_auctions_user_idx    ON public.favorite_auctions (user_id);
CREATE INDEX IF NOT EXISTS favorite_auctions_auction_idx ON public.favorite_auctions (auction_id);

-- Evita o mesmo usuário favoritar o mesmo leilão duas vezes no mesmo contexto
CREATE UNIQUE INDEX IF NOT EXISTS favorite_auctions_unico_idx
  ON public.favorite_auctions (user_id, auction_id, context);