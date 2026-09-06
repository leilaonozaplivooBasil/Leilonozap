-- ============================================================================
-- BLOCO: RESTAURAR-HISTORICO-SISTEMA (system_logs)
-- Data: 2026-08-05
-- Risco: 🟡 MÉDIO — operação puramente ADITIVA e idempotente em tabela de LOG.
--
-- PROBLEMA CONFIRMADO EM PRODUÇÃO (validado por teste real no preview):
--   A tabela `system_logs` é uma CASCA da migração Base44 -> Supabase.
--   Colunas existentes: id, base44_id, created_at, updated_at.
--   NENHUMA coluna de conteúdo existe.
--   Resultado: TODO SystemLog.create() falha com
--   "Could not find the '<coluna>' column of 'system_logs' in the schema cache".
--   Consequência: o app NÃO tem nenhum diagnóstico de erro gravado.
--
-- OBJETIVO:
--   Recriar as colunas que o schema da entidade SystemLog já declara e que o
--   código do app JÁ ENVIA — sem alterar uma única linha do frontend.
--
-- REGRAS APLICADAS:
--   • ADD COLUMN IF NOT EXISTS em tudo (pode rodar 2x sem quebrar)
--   • NENHUMA coluna NOT NULL e NENHUM DEFAULT obrigatório
--     (gravar log JAMAIS pode falhar por validação e derrubar um fluxo real)
--   • NÃO dropa, NÃO renomeia, NÃO altera tipo de coluna existente
--   • NÃO apaga nenhum registro antigo (as linhas vazias permanecem)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) COLUNAS DE CONTEÚDO (todas nullable, espelham base44/entities/SystemLog.jsonc)
-- ---------------------------------------------------------------------------

-- ID da entidade relacionada (auction_id, user_id, etc)
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS entity_id text;

-- Nome do componente/função que gerou o log
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS component_name text;

-- Etapa específica (STEP_1_AUTH, Global_Uncaught_Error, etc)
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS step text;

-- Status: success | error | warning | info | performance | component_lifecycle
--         | api_call | db_query | user_action
-- Propositalmente `text` e NÃO enum: um status novo no app nunca pode
-- fazer a gravação do log falhar.
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS status text;

-- Mensagem descritiva
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS message text;

-- Detalhes técnicos do erro (stack, code, type...)
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS error_details jsonb;

-- User agent do navegador/device
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS user_agent text;

-- Se é dispositivo móvel (essencial pro diagnóstico mobile vs desktop)
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS is_mobile boolean;

-- URL onde ocorreu
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS url text;

-- Tempo de execução em milissegundos
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS execution_time_ms numeric;

-- Dados contextuais: props, params, state, query details
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS payload jsonb;

-- ---------------------------------------------------------------------------
-- 2) CAMPO BUILT-IN BASE44 (só se ainda não existir)
-- ---------------------------------------------------------------------------
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS created_by_id text;

-- ---------------------------------------------------------------------------
-- 3) ÍNDICES — pro painel de diagnóstico não pesar quando o volume crescer
-- ---------------------------------------------------------------------------

-- Consulta padrão do painel: "últimos registros primeiro"
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at
  ON system_logs (created_at DESC);

-- Filtro por status (ex: mostrar só os erros)
CREATE INDEX IF NOT EXISTS idx_system_logs_status
  ON system_logs (status);

-- ============================================================================
-- FIM DO BLOCO
-- Nada foi apagado. Nada foi renomeado. Nenhum tipo foi alterado.
-- Nenhuma outra tabela foi tocada.
-- ============================================================================