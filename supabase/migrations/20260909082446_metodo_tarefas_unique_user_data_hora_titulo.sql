-- ⚠️ ARQUIVO RECUPERADO DO BANCO EM 09/09/2026, NÃO ESCRITO DEPOIS.
--
-- Esta versão estava registrada em supabase_migrations.schema_migrations SEM
-- arquivo correspondente aqui — e é isso que faz o `supabase db push
-- --include-all` do deploy falhar com "Remote migration versions not found in
-- local migrations directory", travando TODA migração seguinte de TODO mundo.
--
-- 📌 A LIÇÃO, PRA NÃO REPETIR: aplicar migração pelo painel ou pelo MCP grava a
-- versão no histórico do banco mas NÃO cria o arquivo. Quem aplicar fora do
-- fluxo tem que commitar o arquivo com o MESMO nome (<versão>_<nome>.sql) no
-- mesmo dia. Criar o mesmo SQL com um timestamp NOVO não resolve: a versão
-- órfã continua órfã, e o canal continua travado.
--
-- O SQL abaixo é cópia fiel do que está gravado no histórico do banco.

ALTER TABLE metodo_tarefas
  ADD CONSTRAINT metodo_tarefas_user_data_hora_titulo_key UNIQUE (user_id, data, hora, titulo);
