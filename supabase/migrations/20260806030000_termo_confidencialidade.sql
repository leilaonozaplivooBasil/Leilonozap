-- 📜 Termo de Confidencialidade (NDA) do Parceiro.
--
-- Reaproveita a MESMA trilha de auditoria das assinaturas (contrato_assinaturas),
-- distinguindo pela coluna `documento` ('contrato_parceria' | 'termo_confidencialidade').
-- Aqui só ADICIONAMOS as colunas dos documentos de identificação enviados.
--
-- ⚠️ Tabela isolada: não encosta em nenhuma tabela financeira.
alter table public.contrato_assinaturas
  add column if not exists doc_identidade_url text,
  add column if not exists doc_cpf_url text;

create index if not exists contrato_assinaturas_documento_idx
  on public.contrato_assinaturas (documento);