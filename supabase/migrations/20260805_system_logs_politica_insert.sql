-- ─────────────────────────────────────────────────────────────
-- BLOCO: RESTAURAR-HISTORICO-SISTEMA — parte 2 de 2
-- DATA: 05/08/2026
-- STATUS: ✅ EXECUTADO em produção (validado com gravação real)
--
-- POR QUE EXISTIU:
--   A parte 1 (20260805_system_logs_restaurar_colunas.sql) devolveu as colunas
--   de conteúdo da tabela system_logs. Mas a gravação CONTINUAVA falhando, agora
--   com outro erro:
--
--       new row violates row-level security policy for table "system_logs"
--
--   Ou seja: a tabela tinha RLS ligada e NENHUMA política de escrita. As colunas
--   existiam, mas ninguém tinha autorização para inserir — nem o próprio app.
--
-- O QUE ESTE SQL FAZ:
--   Cria UMA política que permite APENAS INSERIR registro de log.
--
-- O QUE ELE NÃO FAZ (de propósito):
--   ❌ não permite LER   → leitura segue restrita a admin / service_role
--   ❌ não permite EDITAR → log é imutável
--   ❌ não permite APAGAR → log é append-only, à prova de adulteração
--   ❌ não toca em nenhuma outra tabela nem em nenhuma outra política
--
-- POR QUE 'anon' TAMBÉM:
--   Erro de front pode acontecer com visitante DESLOGADO (ex: na vitrine da
--   Recepção). Sem 'anon', justamente os erros de quem ainda não entrou na conta
--   ficariam invisíveis — que é o caso mais crítico de diagnosticar.
--
-- CONTROLE DE VOLUME:
--   O porteiro anti-duplicação do front (src/lib/logDedupe.js) garante que erro
--   idêntico repetido dentro de 60s grave UMA vez só. Validado: 5 erros iguais
--   viraram 1 registro; 1 erro diferente virou 1 registro.
--
-- ⚠️ O DROP abaixo apaga APENAS a política com este nome exato (que ainda não
--    existia na primeira execução). Serve só para o SQL poder rodar 2x sem erro.
--    Ele NÃO apaga dados, NÃO apaga tabela e NÃO afeta outras políticas.
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS system_logs_insert_publico ON system_logs;

CREATE POLICY system_logs_insert_publico
  ON system_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);