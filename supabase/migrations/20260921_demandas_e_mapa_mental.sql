-- 🧠 DEMANDAS E MAPA MENTAL — a mente esvaziada vira tarefa.
--
-- PEDIDO DO DONO (áudio de 19/09/2026, 10h32):
--   "criar um mapa mental ali do lado, ligado ao quadro… onde eu esvazio a
--    minha mente e dessa mente transformo em tarefa"
--   "estou numa reunião, o pessoal está falando o que tem que fazer, eu só vou
--    esvaziando a mente… entra numa lista com a data do dia que foi anotado"
--
-- 🔴 POR QUE TABELA NOVA, E NÃO `heloim_solicitacoes`
--
-- A que existe foi feita para demanda TÉCNICA: tem `risco` (baixo|medio|alto),
-- `pontos_atencao`, aprovação por admin e post no Slack com thread. É a fila do
-- Heloim, e ela está certa para o que faz.
--
-- Esvaziar a mente é outra coisa. Se a anotação de reunião caísse lá, toda
-- linha que o dono ditasse viraria pedido de aprovação técnica publicado num
-- canal. A decisão foi dele, em 21/09: tabela nova, simples.

-- ── A CAIXA DE ENTRADA ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demandas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL,           -- de quem é a mente
  titulo      text NOT NULL,
  detalhe     text,
  -- 📅 "entra numa lista com a data do dia que foi anotado" — palavras do dono.
  -- É a data da ANOTAÇÃO, não a do vencimento; por isso separada de `prazo`.
  anotada_em  timestamptz NOT NULL DEFAULT now(),
  origem      text NOT NULL DEFAULT 'app'
                CHECK (origem IN ('app', 'whatsapp', 'mapa', 'encontro')),
  -- rastro de quem falou, quando veio do WhatsApp
  origem_ref  text,
  -- 'aberta' enquanto espera destino; some da caixa quando vira tarefa ou é descartada
  estado      text NOT NULL DEFAULT 'aberta'
                CHECK (estado IN ('aberta', 'virou_tarefa', 'descartada')),
  -- para onde foi: o cartão criado no quadro
  cartao_id   text,
  prazo       date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demandas_caixa_idx
  ON public.demandas (user_id, estado, anotada_em DESC);

-- ── O MAPA MENTAL ───────────────────────────────────────────────────────────
-- Um mapa por pessoa, guardado inteiro em jsonb. Nó é `{id, texto, pai, x, y}`.
--
-- Por que jsonb e não uma tabela de nós: o mapa é editado em rajada (arrasta,
-- renomeia, cria três nós seguidos) e lido inteiro. Uma linha por nó daria
-- dezenas de idas ao banco para uma operação que o dono chamou de "simples e
-- objetivo".
CREATE TABLE IF NOT EXISTS public.mapas_mentais (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL,
  titulo      text NOT NULL DEFAULT 'Meu mapa',
  nos         jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mapas_mentais_dono_idx ON public.mapas_mentais (user_id);

-- ── 🔐 QUEM LÊ ──────────────────────────────────────────────────────────────
-- Isto é a cabeça de uma pessoa: anotação de reunião, ideia solta, o que ela
-- precisa fazer. NÃO entra na convenção `USING (true)` das outras tabelas —
-- seria publicar o caderno de todo mundo para a chave que está no site.
--
-- Sem política e sem GRANT: só a service role alcança, e quem serve a tela é
-- uma função de servidor com guarda de dono. Mesma escolha de `emails_enviados`
-- em 20/09.
ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapas_mentais ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.demandas FROM anon, authenticated;
REVOKE ALL ON public.mapas_mentais FROM anon, authenticated;

COMMENT ON TABLE public.demandas IS
  'Caixa de entrada da mente: o que foi anotado e ainda nao virou tarefa. Leitura so por service role, via funcao com guarda de dono.';
COMMENT ON TABLE public.mapas_mentais IS
  'Mapa mental por pessoa; nos em jsonb. Leitura so por service role.';
