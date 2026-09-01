-- DIR-39 (01/09/2026) — INDICAÇÃO RASTREADA NA ESTEIRA: todo contrato tem um
-- executivo do topo como responsável e, quando veio por indicação de alguém
-- da estrutura de negócio, a pessoa que indicou fica carimbada — e ela
-- PRECISA estar cadastrada no app (regra do dono: indicação sem cadastro não
-- existe; o app só grava indicações escolhidas entre usuários reais).
ALTER TABLE public.captacao_oportunidades
  ADD COLUMN IF NOT EXISTS indicacao_user_id TEXT,
  ADD COLUMN IF NOT EXISTS indicacao_nome TEXT;

COMMENT ON COLUMN public.captacao_oportunidades.indicacao_user_id IS
  'app_users.id de quem indicou o negócio (sempre um usuário cadastrado — DIR-39)';
COMMENT ON COLUMN public.captacao_oportunidades.indicacao_nome IS
  'Nome de quem indicou, no momento do carimbo (denormalizado pra leitura rápida)';
