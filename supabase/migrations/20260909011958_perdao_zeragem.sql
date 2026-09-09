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

alter table public.xgame_config
  add column if not exists perdao_zeragem_ate date;

comment on column public.xgame_config.perdao_zeragem_ate is
  'Enquanto a data de hoje (local) for <= este valor, resumoDoDia() (src/lib/xgame.js) NUNCA zera o dia por não-votar/atraso-do-pronto, não importa o motivo — e um perdao total daquele dia, nao uma trava de regra. null = sem perdao ativo (comportamento normal). E de uso raro e manual: o super_admin liga so quando algo excepcional (bug, lista de votacao mudou no meio do dia) injusticou todo mundo, e desliga (null) no dia seguinte.';
