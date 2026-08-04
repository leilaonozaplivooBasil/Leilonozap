-- PONTO 81 FASE 1B — tokens OAuth do Melhor Envio.
--
-- 🔴 Tabela de CREDENCIAL. Acesso exclusivo via service_role (backend).
-- RLS habilitada e SEM NENHUMA policy: com RLS ligada e zero policy, o cliente
-- anon/authenticated não lê nem escreve nada aqui. O service_role ignora RLS.
--
-- ⚠️ Sandbox e produção são contas SEPARADAS no Melhor Envio: por isso o token
-- é guardado por 'ambiente', e só um fica ativo por ambiente.

CREATE TABLE IF NOT EXISTS public.melhor_envio_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambiente      text NOT NULL CHECK (ambiente IN ('sandbox', 'producao')),
  access_token  text NOT NULL,
  refresh_token text,
  expires_at    timestamptz,
  obtido_em     timestamptz NOT NULL DEFAULT now(),
  escopos       text,
  ativo         boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Busca padrão da função: token vigente do ambiente atual, mais recente primeiro.
CREATE INDEX IF NOT EXISTS melhor_envio_tokens_ambiente_ativo_idx
  ON public.melhor_envio_tokens (ambiente, ativo, obtido_em DESC);

ALTER TABLE public.melhor_envio_tokens ENABLE ROW LEVEL SECURITY;