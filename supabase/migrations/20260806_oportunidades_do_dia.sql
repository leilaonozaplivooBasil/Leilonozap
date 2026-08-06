-- 🌟 OPORTUNIDADES DO DIA (painel do Parceiro) — 06/08/2026
--
-- Somente ACRESCENTA colunas em lotes_recebidos. Nada é removido, nada é
-- renomeado, nenhum dado existente é alterado. Rodar no SQL Editor do Supabase.

ALTER TABLE public.lotes_recebidos
  ADD COLUMN IF NOT EXISTS publicado_parceiro  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_leilao         timestamptz,
  ADD COLUMN IF NOT EXISTS lance_entrada       numeric  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frete_oportunidade  numeric  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vagas               integer  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS observacao_parceiro text;

-- Busca da vitrine: publicadas, ordenadas pelo horário do leilão.
CREATE INDEX IF NOT EXISTS lotes_recebidos_oportunidades_idx
  ON public.lotes_recebidos (publicado_parceiro, data_leilao);

-- 👁️ OPÇÃO A — leitura liberada APENAS das linhas publicadas ao parceiro.
-- A escrita continua exclusiva do admin (service_role via loteRecebidoWrite).
DROP POLICY IF EXISTS "oportunidades_publicadas_leitura" ON public.lotes_recebidos;
CREATE POLICY "oportunidades_publicadas_leitura"
  ON public.lotes_recebidos
  FOR SELECT
  USING (publicado_parceiro = true);