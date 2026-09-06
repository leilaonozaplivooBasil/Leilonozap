-- ============================================================================
-- Fecha o backup de rótulos do Financeiro: RLS ligado
-- ============================================================================
-- 06/09/2026. O próprio Supabase levantou o alerta, nível crítico:
--
--   "public.financeiro_rotulos_backup_20260905 tem Row Level Security
--    desabilitada. A tabela está totalmente exposta aos papéis anon e
--    authenticated — qualquer um com a chave pública pode ler ou alterar
--    todas as linhas."
--
-- Ela nasceu em 20260905120000_rotulos_financeiro_unificados.sql como
-- `CREATE TABLE ... AS SELECT`, e é aí que mora o problema: essa forma NÃO
-- herda RLS da tabela de origem e não liga nada por padrão. A origem,
-- financial_expenses, é protegida; a cópia nasceu aberta — com 133 linhas de
-- categoria e centro de custo de cada gasto da empresa.
--
-- POR QUE SEM POLICY, E POR QUE ISSO NÃO QUEBRA NADA:
-- RLS ligada sem nenhuma policy nega tudo para anon e authenticated, e deixa
-- passar só o service_role. É exatamente o que se quer aqui: conferi o
-- repositório inteiro e NENHUM código lê esta tabela — as duas únicas
-- menções estão dentro da migração que a criou (o CREATE e o comentário do
-- desfazer). Ela existe para uma coisa só: o rollback dos UPDATEs de rótulo,
-- que é rodado por um humano no SQL Editor, onde a conexão é service_role e
-- continua enxergando tudo.
--
-- É o mesmo padrão dos outros backups da casa (auction_messages_data_backup
-- e app_segredos): dado interno, RLS ligada, sem policy.
-- ============================================================================

ALTER TABLE public.financeiro_rotulos_backup_20260905 ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.financeiro_rotulos_backup_20260905 IS
  'Backup de category/cost_center de financial_expenses antes da unificação de grafias (05/09/2026). Dado interno: RLS ligada e SEM policy — só service_role lê. Não criar policy aqui.';
