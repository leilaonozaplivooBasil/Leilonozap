-- DIR-161 (16/09/2026) — dono, sobre a corrida da empresa às 4h de hoje que
-- fez muita gente perder o Ritual do Amanhecer: "eu tenho que ter um botão
-- pra apertar e liberar as tarefas das pessoas até tal hora pra eles
-- ganharem" + "eu preciso ter um botão de organizar a gamificação das
-- pessoas de acordo com alguns eventos da empresa" (ex.: Mentalidade do CEO,
-- segunda 9h-13h, com rotina própria naquele horário).
--
-- Duas tabelas independentes:
--
-- `xgame_liberacoes` — perdão PONTUAL, por pessoa e por dia: as tarefas cujo
-- horário normal cai antes de `ate_hora` passam a valer como se fossem
-- ÀQUELA hora (não perdem MvM/pontos/X-Pay por atraso durante a janela do
-- evento) — ver `aplicarLiberacao`/`resumoDoDia` em src/lib/xgame.js. Não
-- mexe nas duas réguas catastróficas (não-votar / atraso do pronto) — isso
-- já é o `perdao_zeragem_ate` (DIR-96/97).
CREATE TABLE IF NOT EXISTS public.xgame_liberacoes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , data DATE NOT NULL
  , user_id TEXT NOT NULL
  , ate_hora TEXT NOT NULL          -- 'HH:mm' — tarefas antes disso não perdem por atraso
  , motivo TEXT
  , criado_por_id TEXT
  , criado_por_nome TEXT
  , created_date TIMESTAMPTZ DEFAULT now()
  , updated_at TIMESTAMPTZ DEFAULT now()
  , UNIQUE(data, user_id)           -- apertar o botão de novo no mesmo dia ATUALIZA, não duplica
);

ALTER TABLE public.xgame_liberacoes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY xgame_liberacoes_select ON public.xgame_liberacoes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xgame_liberacoes_insert ON public.xgame_liberacoes FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xgame_liberacoes_update ON public.xgame_liberacoes FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xgame_liberacoes_delete ON public.xgame_liberacoes FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.xgame_liberacoes IS
  'Liberação pontual do X-Game (DIR-161): tarefas de um dia, de uma pessoa, antes de ate_hora não perdem MvM/pontos/X-Pay por atraso — pra dias de evento (ex.: corrida da empresa às 4h).';

-- `xgame_eventos` — evento RECORRENTE semanal (ou data única): tem sua
-- própria lista de tarefas, que SUBSTITUI a rotina normal de quem está em
-- `participantes` durante [hora_inicio, hora_fim) daquele dia — aplica
-- sozinho toda semana, sem precisar reativar (ver `eventoAplicavelHoje`/
-- `substituirJanelaDoEvento` em src/lib/eventosGamificacao.js).
CREATE TABLE IF NOT EXISTS public.xgame_eventos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , nome TEXT NOT NULL
  , dia_semana SMALLINT             -- 0=domingo ... 6=sábado; NULL = data única
  , data DATE                       -- usada quando dia_semana é NULL
  , hora_inicio TEXT NOT NULL       -- 'HH:mm'
  , hora_fim TEXT NOT NULL          -- 'HH:mm'
  , tarefas JSONB NOT NULL DEFAULT '[]'::jsonb   -- [{hora,titulo,detalhe}], mesma forma de metodo_perfil.rotina
  , participantes TEXT[] NOT NULL DEFAULT '{}'   -- user_ids que entram no evento
  , ativo BOOLEAN NOT NULL DEFAULT true
  , criado_por_id TEXT
  , criado_por_nome TEXT
  , created_date TIMESTAMPTZ DEFAULT now()
  , updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.xgame_eventos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY xgame_eventos_select ON public.xgame_eventos FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xgame_eventos_insert ON public.xgame_eventos FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xgame_eventos_update ON public.xgame_eventos FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY xgame_eventos_delete ON public.xgame_eventos FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.xgame_eventos IS
  'Eventos recorrentes do X-Game (DIR-161): rotina própria que substitui a normal, na janela de horário, de quem está em participantes — aplica toda semana sozinho (ex.: Mentalidade do CEO, segunda 9h-13h).';
