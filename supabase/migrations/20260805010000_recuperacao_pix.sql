-- ============================================================================
-- RECUPERAÇÃO DE PIX NÃO PAGO — colunas de controle dos toques
-- Data: 05/08/2026
-- Risco: 🟢 (só ADICIONA colunas; não altera nem apaga nada existente)
-- ============================================================================
--
-- POR QUE ESTAS COLUNAS EXISTEM:
-- A rotina de recuperação roda de 30 em 30 minutos. Sem registrar QUANDO cada
-- toque foi enviado, a mesma mensagem sairia a cada rodada — o cliente receberia
-- dezenas de WhatsApp do mesmo pedido. Estas colunas são a MEMÓRIA da rotina:
-- se já tem data gravada, aquele toque nunca é repetido.
--
-- ⚠️ LIÇÃO DAS "TABELAS CASCA" (CONTRATO.md): confirme no SQL Editor que as
-- colunas realmente apareceram antes de confiar que a rotina consegue gravar.
-- Verificação: select recuperacao_toque1_em, recuperacao_toque2_em
--              from catalog_sales limit 1;
-- ============================================================================

alter table public.catalog_sales
  add column if not exists recuperacao_toque1_em timestamptz,
  add column if not exists recuperacao_toque2_em timestamptz;

-- Índice para a rotina achar rapidamente os pedidos que ainda não receberam o 1º toque
create index if not exists idx_catalog_sales_recuperacao
  on public.catalog_sales (status, created_date)
  where status = 'pending_payment';

comment on column public.catalog_sales.recuperacao_toque1_em is
  'Data/hora do 1º aviso de pagamento pendente (12h). NULL = nunca enviado.';
comment on column public.catalog_sales.recuperacao_toque2_em is
  'Data/hora do 2º e ÚLTIMO aviso (20h), antes do cancelamento em 24h. NULL = nunca enviado.';