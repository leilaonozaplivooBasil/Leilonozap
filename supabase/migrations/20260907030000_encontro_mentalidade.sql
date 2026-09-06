-- 🧠 O ENCONTRO DA MENTALIDADE (dono, 06/09/2026):
-- "toda segunda a gente tem esse encontro — a Mentalidade do Executivo, do
-- Diretor e do CEO. Quero um lugar estratégico, não na parte administrativa,
-- junto com os 8 Hábitos. Quando eu clicar, a apresentação da reunião com o
-- tópico; uma IA pra eu digitar as pautas e ela gerar o tópico; o cronômetro:
-- 15 minutos de leitura, 45 de treinamento, 2 horas de reunião estratégica.
-- E conforme a reunião acontece, as pautas já vão virando demanda pra cada
-- um, gerando no painel de cada um, numa visão executiva de produção pra ser
-- concluído durante a semana. É UM espaço só, não três."
--
-- A reunião de segunda já era um documento (xperf_encontros, DIR-72: uma por
-- data). Ela ganha o que faltava:
--   • pautas    — o que o dono digitou, cru;
--   • roteiro   — o tópico gerado (IA ou régua local), em JSONB: leitura,
--                 treinamento e os tópicos da reunião com minutos e responsável
--                 sugerido;
--   • cronometro — o estado dos três blocos (acumulado e início de cada um),
--                 pra sobreviver a recarga e valer em qualquer aparelho;
--   • demandas  — viraram tabela própria (xperf_demandas, abaixo);
--   • tema, conduzido_por_nome, treinamento_por_nome — quem conduz e quem treina.
-- E a demanda que nasce na reunião fica LIGADA a ela: metodo_tarefas e
-- metodo_quadro ganham encontro_id, que é o que faz a visão executiva da
-- semana (o que saiu desta reunião e como está).
ALTER TABLE public.xperf_encontros
  ADD COLUMN IF NOT EXISTS pautas TEXT,
  ADD COLUMN IF NOT EXISTS roteiro JSONB,
  ADD COLUMN IF NOT EXISTS cronometro JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tema TEXT,
  ADD COLUMN IF NOT EXISTS conduzido_por_nome TEXT,
  ADD COLUMN IF NOT EXISTS treinamento_por_nome TEXT,
  ADD COLUMN IF NOT EXISTS roteiro_origem TEXT;   -- 'ia' | 'local'

COMMENT ON COLUMN public.xperf_encontros.roteiro IS 'O tópico do encontro gerado a partir das pautas: {tema, leitura, treinamento, reuniao:{topicos[]}, fechamento}.';
COMMENT ON COLUMN public.xperf_encontros.cronometro IS 'Os três blocos (15 leitura · 45 treinamento · 120 reunião): {atual, terminado, blocos:{id:{acumulado, inicio}}}.';

ALTER TABLE public.metodo_tarefas
  ADD COLUMN IF NOT EXISTS encontro_id UUID REFERENCES public.xperf_encontros(id) ON DELETE SET NULL;
ALTER TABLE public.metodo_quadro
  ADD COLUMN IF NOT EXISTS encontro_id UUID REFERENCES public.xperf_encontros(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_metodo_tarefas_encontro ON public.metodo_tarefas(encontro_id) WHERE encontro_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_metodo_quadro_encontro ON public.metodo_quadro(encontro_id) WHERE encontro_id IS NOT NULL;

COMMENT ON COLUMN public.metodo_tarefas.encontro_id IS 'A reunião de segunda de onde a demanda saiu (visão executiva da semana).';
COMMENT ON COLUMN public.metodo_quadro.encontro_id IS 'A reunião de segunda de onde o card saiu.';

-- ── 📥 A DEMANDA (dono, 06/09/2026, em seguida) ─────────────────────────────
-- "Dentro de cada um, o painel corporativo: ele vê as metas, RECEBE as
-- demandas — da reunião de diretoria, do CEO, dos diretores — e dali direciona
-- pro seu quadro, de acordo com os seus horários. Entra como visão geral pra
-- todo mundo, um fica tomando conta do outro."
-- Então a demanda é uma coisa própria: nasce no encontro (ou na mão de um
-- diretor), chega RECEBIDA no painel da pessoa, e é ELA quem agenda: vira
-- tarefa do dia (metodo_tarefas) e/ou card do quadro (metodo_quadro). O
-- estado vem do que a tarefa fez (feita, pronto, conferida); a demanda guarda
-- só os vínculos. Ninguém apaga demanda: devolve com motivo.
CREATE TABLE IF NOT EXISTS public.xperf_demandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  , titulo TEXT NOT NULL
  , detalhe TEXT
  , pessoa_id TEXT NOT NULL
  , pessoa_nome TEXT
  , origem TEXT NOT NULL DEFAULT 'encontro'        -- encontro | ceo | diretor | gestao
  , criado_por_id TEXT
  , criado_por_nome TEXT
  , encontro_id UUID REFERENCES public.xperf_encontros(id) ON DELETE SET NULL
  , prazo_em TIMESTAMPTZ                            -- o "pronto até" combinado na reunião
  , mentalidade TEXT                                -- executivo | diretor | ceo
  , habito SMALLINT CHECK (habito BETWEEN 1 AND 8)
  , peso SMALLINT NOT NULL DEFAULT 3 CHECK (peso BETWEEN 1 AND 6)
  , categoria TEXT NOT NULL DEFAULT 'mentoria'
  , status TEXT NOT NULL DEFAULT 'recebida'
      CHECK (status IN ('recebida', 'agendada', 'devolvida'))
  , agendada_para DATE                              -- o dia que a pessoa escolheu
  , hora TEXT                                       -- e a hora
  , tarefa_id TEXT                                  -- metodo_tarefas.id (o dia)
  , card_id TEXT                                    -- metodo_quadro.id (o quadro)
  , devolvida_motivo TEXT
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_xperf_demandas_pessoa ON public.xperf_demandas(pessoa_id, status);
CREATE INDEX IF NOT EXISTS idx_xperf_demandas_encontro ON public.xperf_demandas(encontro_id) WHERE encontro_id IS NOT NULL;

COMMENT ON TABLE public.xperf_demandas IS
  'X-PERFORMANCE: a demanda que chega no Painel Corporativo da pessoa (do encontro de segunda, do CEO, de um diretor). Ela agenda no dia/quadro dela; o estado vem da tarefa.';

ALTER TABLE public.xperf_demandas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY xperf_demandas_select ON public.xperf_demandas FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xperf_demandas_insert ON public.xperf_demandas FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xperf_demandas_update ON public.xperf_demandas FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xperf_demandas_delete ON public.xperf_demandas FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- a demanda deixa o rastro também na tarefa e no card que ela virou
ALTER TABLE public.metodo_tarefas ADD COLUMN IF NOT EXISTS demanda_id UUID;
ALTER TABLE public.metodo_quadro ADD COLUMN IF NOT EXISTS demanda_id UUID;
