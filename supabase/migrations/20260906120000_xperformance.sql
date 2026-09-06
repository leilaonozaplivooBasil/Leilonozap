-- 🏛️ X-PERFORMANCE — planejamento executivo da diretoria (06/09/2026)
--
-- Ordem do dono: "toda segunda-feira a gente tem uma reunião, eu quero
-- visualizar isso dentro do sistema, onde tem tópicos que a gente precisa
-- sempre de documentos... um sistema igual Trello... isso vira produção dentro
-- do planejamento de acordo com cada membro da diretoria... cada diretor e
-- executivo tem um fixo e eles têm os entregáveis para serem sócios."
--
-- DUAS TABELAS, E SÓ. O resto o sistema já tem:
--   • o cargo (trainee|executivo|diretor|ceo) vive em xgame_participantes;
--   • o FIXO vive lá também (verba_producao/verba_bonus) — aqui não se guarda
--     dinheiro nenhum, de propósito: uma verdade só, num lugar só;
--   • a reunião como COMPROMISSO já é reunioes_empresa (DIR-52). O que falta e
--     entra aqui é a PAUTA — o documento que a reunião produz.
--
-- MIGRAÇÃO ADITIVA: dois CREATE TABLE IF NOT EXISTS. Nada existente é alterado,
-- nenhuma linha de dado é tocada.

-- ── A REUNIÃO DE SEGUNDA, COMO DOCUMENTO ────────────────────────────────────
-- `blocos` é JSONB com a pauta fixa ({numeros, gargalo, decisoes, compromissos}).
-- É JSONB e não quatro colunas de texto porque a pauta é regra de negócio, não
-- de banco: quando o dono acrescentar um bloco, é uma linha em lib/xperformance
-- e não uma migração — e as reuniões velhas continuam abrindo do mesmo jeito.
--
-- UMA reunião por segunda: a chave única em `data` é o que impede duas atas da
-- mesma semana brigando pela verdade.
CREATE TABLE IF NOT EXISTS public.xperf_encontros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  , data DATE NOT NULL UNIQUE
  , trilha TEXT NOT NULL DEFAULT 'diretor'   -- executivo | diretor | ceo
  , blocos JSONB NOT NULL DEFAULT '{}'::jsonb
  , criado_por_id TEXT
  , criado_por_nome TEXT
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.xperf_encontros IS
  'X-PERFORMANCE: a reunião de segunda da diretoria como documento. Um por semana (data é única). blocos = a pauta fixa em JSONB.';

-- ── O QUADRO DE ENTREGÁVEIS ─────────────────────────────────────────────────
-- `coluna` é o estado no quadro. A regra de que nada chega em 'entregue' sem
-- passar por 'revisao' mora em lib/xperformance.js, com teste — aqui o CHECK
-- só garante que não entre um estado inventado.
--
-- `peso` de 1 a 5 é o que vira ponto no caminho da sociedade, e SÓ conta quando
-- a coluna é 'entregue'. Isso é regra da lib, não do banco: o banco guarda o
-- fato, a lib decide o que ele vale.
CREATE TABLE IF NOT EXISTS public.xperf_entregaveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  , titulo TEXT NOT NULL
  , detalhe TEXT
  , trilha TEXT NOT NULL DEFAULT 'diretor'
  , coluna TEXT NOT NULL DEFAULT 'combinado'
      CHECK (coluna IN ('combinado', 'fazendo', 'revisao', 'entregue'))
  , peso SMALLINT NOT NULL DEFAULT 1 CHECK (peso BETWEEN 1 AND 5)
  , habito SMALLINT CHECK (habito BETWEEN 1 AND 8)   -- a qual Hábito ele serve
  , dono_id TEXT
  , dono_nome TEXT
  , prazo DATE
  , encontro_id UUID REFERENCES public.xperf_encontros(id) ON DELETE SET NULL
  , validado_por_id TEXT
  , validado_em TIMESTAMPTZ
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- O card nasce na reunião e sobrevive a ela: se a ata for apagada, o
-- compromisso continua no quadro (ON DELETE SET NULL). O contrário — sumir com
-- o entregável junto com a ata — seria perder trabalho combinado.

CREATE INDEX IF NOT EXISTS idx_xperf_entregaveis_dono ON public.xperf_entregaveis (dono_id, coluna);
CREATE INDEX IF NOT EXISTS idx_xperf_entregaveis_encontro ON public.xperf_entregaveis (encontro_id);

COMMENT ON TABLE public.xperf_entregaveis IS
  'X-PERFORMANCE: o quadro de entregáveis da diretoria. Só coluna=entregue vira ponto no caminho da sociedade (regra em src/lib/xperformance.js).';

-- ── RLS no padrão da casa ───────────────────────────────────────────────────
-- Estas duas são de LEITURA COMPARTILHADA de propósito: o valor do quadro é
-- todo mundo ver o que cada um combinou entregar. Sem transparência ele vira
-- lista de tarefa particular, e aí não organiza diretoria nenhuma.
ALTER TABLE public.xperf_encontros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xperf_entregaveis ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY xperf_encontros_select ON public.xperf_encontros FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xperf_encontros_insert ON public.xperf_encontros FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xperf_encontros_update ON public.xperf_encontros FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xperf_encontros_delete ON public.xperf_encontros FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY xperf_entregaveis_select ON public.xperf_entregaveis FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xperf_entregaveis_insert ON public.xperf_entregaveis FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xperf_entregaveis_update ON public.xperf_entregaveis FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xperf_entregaveis_delete ON public.xperf_entregaveis FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
