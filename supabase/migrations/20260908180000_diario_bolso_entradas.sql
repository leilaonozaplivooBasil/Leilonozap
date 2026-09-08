-- DIÁRIO DE BOLSO — terreno da Fase 2 (08/09/2026).
--
-- A Fase 1 (aba "Diário de bolso" na Top College) monta o diário NA HORA,
-- lendo metodo_tarefas — sem gravar nada. O dono pediu pra preparar o
-- terreno da Fase 2 enquanto ainda confere a Fase 1: esta tabela existe,
-- mas NINGUÉM grava nela ainda — nenhuma tela, nenhum cron, chama a escrita
-- até a Fase 2 ser ligada de propósito. Só existir não muda nada em produção.
--
-- POR QUE UMA TABELA NOVA, E NÃO REAPROVEITAR `xgame_diario`: aquele nome já
-- é "diário" no sentido de "do dia" — o placar numérico da gamificação (MvM,
-- token, pontos), recalculável a qualquer momento, sem texto nenhum. Este
-- aqui é outra coisa: uma linha de PROSA por tarefa, com espaço pra pessoa
-- comentar por cima. Reaproveitar o nome ia confundir os dois pra sempre.
--
-- O QUE CADA COLUNA GUARDA:
--   texto         — o texto que a Fase 1 já monta (resumo da comprovação →
--                   o que a IA viu → ensinamento da tarefa → detalhe),
--                   CONGELADO no momento da gravação — não recalcula sozinho
--                   se a tarefa de origem mudar depois.
--   fonte         — de qual das quatro fontes o texto veio, pra tela poder
--                   mostrar/filtrar diferente (ex.: "escrito por você" vs
--                   "a IA viu" vs "o método explica").
--   nota_pessoal  — o que a PRÓPRIA pessoa escreve por cima do texto
--                   automático, se quiser comentar/completar. Não existe
--                   ainda na Fase 1 (só leitura); é o motivo real de existir
--                   uma tabela em vez de só ler ao vivo pra sempre.
--   tarefa_id     — de onde veio (metodo_tarefas.id), sem FK (padrão da casa,
--                   igual xgame_participantes/xgame_diario): se a tarefa
--                   de origem for apagada um dia, a entrada do diário e a
--                   nota da pessoa continuam existindo.
CREATE TABLE IF NOT EXISTS public.diario_bolso_entradas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , user_id TEXT NOT NULL
  , data DATE NOT NULL
  , hora TEXT                      -- 'HH:mm', pra ordenar dentro do dia como a Fase 1 já faz
  , tarefa_id TEXT                 -- metodo_tarefas.id de origem (sem FK — ver acima)
  , titulo TEXT NOT NULL
  , texto TEXT                     -- o texto composto, congelado no momento da gravação
  , fonte TEXT                     -- resumo | ia | ensinamento | detalhe | null
  , nota_pessoal TEXT              -- o que a pessoa escreve por cima (Fase 2)
  , created_date TIMESTAMPTZ DEFAULT now()
  , updated_at TIMESTAMPTZ DEFAULT now()
  , UNIQUE (tarefa_id)             -- uma tarefa só pode virar UMA entrada — grava de novo = atualiza
);
CREATE INDEX IF NOT EXISTS idx_diario_bolso_entradas_user_data ON public.diario_bolso_entradas (user_id, data);

ALTER TABLE public.diario_bolso_entradas ENABLE ROW LEVEL SECURITY;

-- Padrão da casa (igual metodo_tarefas/xgame_diario): políticas permissivas —
-- o escopo por usuário é aplicado no app; a chave anon só lê/escreve o que o
-- app pede.
DO $$ BEGIN
  CREATE POLICY diario_bolso_entradas_select ON public.diario_bolso_entradas FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY diario_bolso_entradas_insert ON public.diario_bolso_entradas FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY diario_bolso_entradas_update ON public.diario_bolso_entradas FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.diario_bolso_entradas IS
  'Diário de bolso (Fase 2, terreno preparado em 08/09/2026 — ainda não usada por nenhuma tela): uma entrada por tarefa feita, com o texto composto pela Fase 1 congelado, mais a nota pessoal opcional da própria pessoa por cima.';
