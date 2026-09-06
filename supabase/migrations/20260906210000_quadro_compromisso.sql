-- 🗂️ DIR-75 (06/09/2026) — O NOSSO QUADRO, dentro do Compromisso.
--
-- Ordem do dono: "a gente fazer o nosso Trello, o nosso, ALI" — no Hábito 2,
-- junto com o dia. É o ambiente da tarefa das 10:30 ("Organização do negócio:
-- prioridades, Master Task, pipeline, contratos, reuniões").
--
-- ⚠️ ISTO NÃO É O QUADRO DO X-PERFORMANCE, e a diferença é de propósito:
--   • xperf_entregaveis é da DIRETORIA e COMPARTILHADO — o valor dele é todo
--     mundo ver o que cada um combinou entregar;
--   • metodo_quadro é PESSOAL (user_id) — é a mesa de trabalho de uma pessoa.
--   Juntar os dois pelo nome parecido poria a pendência de contrato de um na
--   tela do outro.
--
-- As colunas são HORIZONTES, não etapas: hoje | semana | depois | feito. É
-- assim que a cabeça organiza o próprio dia ("isso é pra hoje, isso fica pra
-- semana"), e é o mesmo vocabulário do Quadro dos Sonhos (curto/médio/longo).
CREATE TABLE IF NOT EXISTS public.metodo_quadro (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , user_id TEXT NOT NULL
  , titulo TEXT NOT NULL
  , detalhe TEXT
  , coluna TEXT NOT NULL DEFAULT 'hoje'
      CHECK (coluna IN ('hoje', 'semana', 'depois', 'feito'))
  -- a qual dos 8 Hábitos este cartão serve. É o que faz o botão "abrir a
  -- ferramenta" existir no cartão, igual ao da linha da tarefa.
  , habito SMALLINT CHECK (habito BETWEEN 1 AND 8)
  , responsavel_nome TEXT
  , prazo DATE
  -- 🔗 a frase do dono: "já vai entrar na minha reunião do dia". Quando o
  -- cartão vira tarefa, guarda-se o id da tarefa criada — sem isso o mesmo
  -- cartão viraria tarefa de novo a cada clique e o dia encheria de repetido.
  , virou_tarefa_id TEXT
  , virou_tarefa_em TIMESTAMPTZ
  , ordem INTEGER DEFAULT 0
  , created_date TIMESTAMPTZ DEFAULT now()
  , updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metodo_quadro_user ON public.metodo_quadro (user_id, coluna);

COMMENT ON TABLE public.metodo_quadro IS
  'DIR-75: o quadro PESSOAL da organização do negócio, dentro do Hábito 2 (Compromisso). Colunas por horizonte. Não confundir com xperf_entregaveis, que é o quadro compartilhado da diretoria.';

ALTER TABLE public.metodo_quadro ENABLE ROW LEVEL SECURITY;

-- Padrão da casa (igual metodo_tarefas): políticas permissivas, escopo por
-- usuário aplicado no app.
DO $$ BEGIN
  CREATE POLICY metodo_quadro_select ON public.metodo_quadro FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY metodo_quadro_insert ON public.metodo_quadro FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY metodo_quadro_update ON public.metodo_quadro FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY metodo_quadro_delete ON public.metodo_quadro FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
