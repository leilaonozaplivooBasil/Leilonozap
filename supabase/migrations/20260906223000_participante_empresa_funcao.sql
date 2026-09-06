-- 🏢 A EMPRESA E A FUNÇÃO DE CADA UM (06/09/2026)
--
-- Ditado pelo dono: "eu preciso identificar qual é a empresa — a gente tem a
-- e-Digital (marketing digital e tecnologia), o Leilão no Zap e a X-EOS.
-- Todos hoje operacionalizam o Leilão no Zap; o Jean, que é CMO, trabalha
-- pro Leilão no Zap através da e-Digital. E a partir da função — Diretor de
-- Operações — o sistema já me dá as tarefas do dia dele."
--
-- MIGRAÇÃO ADITIVA em xgame_participantes:
--  • empresa       — pra quem a pessoa trabalha (leilao_no_zap | e_digital | xeos)
--  • empresa_via   — através de qual empresa (opcional; ex.: e_digital)
--  • funcao_titulo — o nome da função quando o painel de controle não tem
--                    (ex.: "CMO"). NULL = usa o nível do painel.
ALTER TABLE public.xgame_participantes
  ADD COLUMN IF NOT EXISTS empresa TEXT,
  ADD COLUMN IF NOT EXISTS empresa_via TEXT,
  ADD COLUMN IF NOT EXISTS funcao_titulo TEXT;

COMMENT ON COLUMN public.xgame_participantes.empresa IS 'Pra qual empresa a pessoa trabalha: leilao_no_zap | e_digital | xeos.';
COMMENT ON COLUMN public.xgame_participantes.empresa_via IS 'Através de qual empresa (ex.: CMO da e-Digital atendendo o Leilão no Zap).';
COMMENT ON COLUMN public.xgame_participantes.funcao_titulo IS 'A função por extenso quando o painel de controle não tem (ex.: CMO). NULL = o nível do painel.';
