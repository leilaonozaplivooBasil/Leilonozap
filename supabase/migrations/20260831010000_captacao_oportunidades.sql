-- DIR-34 (30/08/2026) — ESTEIRA DE CAPTAÇÃO: oportunidades de aporte de
-- parceiro e venda de licença, do agendamento da reunião ao contrato
-- assinado. Estágios oficiais ditados pelo dono (probabilidade fixa):
-- reuniao_agendada 10 · sem_interesse 0 · interesse_futuro 20 ·
-- interesse_nova_reuniao 40 · fechado_50 · fechado_70 · fechado_99 ·
-- fechado_100. O escopo (cada responsável vê a própria carteira; visão
-- total vê tudo) é aplicado no app, como nas demais tabelas.
CREATE TABLE IF NOT EXISTS public.captacao_oportunidades (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , cliente_user_id TEXT
  , cliente_nome TEXT NOT NULL
  , cliente_email TEXT
  , cliente_telefone TEXT
  , tipo TEXT NOT NULL DEFAULT 'aporte_parceiro'
  , valor_previsto NUMERIC
  , estagio TEXT NOT NULL DEFAULT 'reuniao_agendada'
  , motivo_perda TEXT
  , reuniao_em TIMESTAMPTZ
  , recontato_em DATE
  , pendencias JSONB
  , historico JSONB
  , anotacoes TEXT
  , responsavel_id TEXT
  , responsavel_nome TEXT
  , criado_por_id TEXT
  , estagio_desde TIMESTAMPTZ DEFAULT now()
  , fechado_em TIMESTAMPTZ
  , venda_id TEXT
  , created_date TIMESTAMPTZ DEFAULT now()
  , updated_date TIMESTAMPTZ DEFAULT now()
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_captacao_oport_estagio ON public.captacao_oportunidades(estagio);
CREATE INDEX IF NOT EXISTS idx_captacao_oport_responsavel ON public.captacao_oportunidades(responsavel_id);
ALTER TABLE public.captacao_oportunidades ENABLE ROW LEVEL SECURITY;
-- O app usa a chave pública (auth própria via app_users): leitura e escrita
-- liberadas no banco, escopo garantido no app — mesmo modelo das demais
-- telas. DELETE não é liberado: oportunidade não se apaga, se perde
-- (estagio sem_interesse) — o histórico é o ativo.
DROP POLICY IF EXISTS captacao_oport_select ON public.captacao_oportunidades;
CREATE POLICY captacao_oport_select ON public.captacao_oportunidades FOR SELECT USING (true);
DROP POLICY IF EXISTS captacao_oport_insert ON public.captacao_oportunidades;
CREATE POLICY captacao_oport_insert ON public.captacao_oportunidades FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS captacao_oport_update ON public.captacao_oportunidades;
CREATE POLICY captacao_oport_update ON public.captacao_oportunidades FOR UPDATE USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_captacao_oport_updated_at ON public.captacao_oportunidades;
CREATE TRIGGER trg_captacao_oport_updated_at BEFORE UPDATE ON public.captacao_oportunidades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
