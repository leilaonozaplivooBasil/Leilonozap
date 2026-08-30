-- DIR-29 (30/08/2026) — rastro de LOGIN pro KPI "Usuários ativos" da diretoria.
-- O servidor (api/functions/login.js e googleLogin.js) carimba a cada login;
-- o Dashboard passa a contar ativo = logou OU movimentou dinheiro em 30 dias.
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_app_users_last_login ON public.app_users(last_login);
