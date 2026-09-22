-- 🗺️ MAPA MENTAL — o lugar onde o dono esvazia a mente.
--
-- PEDIDO DO DONO (áudio de 19/09/2026, 10h32):
--   "criar um mapa mental ali do lado, ligado ao quadro… onde eu esvazio a
--    minha mente e dessa mente transformo em tarefa. SIMPLES E OBJETIVO."
--
-- 🔴 ESTA MIGRAÇÃO JÁ CRIOU UMA TABELA `demandas`, E ELA FOI REMOVIDA (21/09).
--
-- A versão anterior criava, junto com o mapa, uma tabela `demandas` própria —
-- caixa de entrada, estado, conversão em cartão. Nada disso precisava existir:
-- `xperf_demandas` já faz exatamente isso desde 06/09, e é ela que alimenta o
-- Painel Corporativo, o Encontro da Mentalidade e a Performance da Equipe.
-- Ela tem `pessoa_id` (o "direciono para onde eu quero" do pedido) e
-- `tarefa_id`/`card_id` (virar trabalho), que a tabela nova nem tinha.
--
-- `src/pages/Demandas.jsx` já avisava, em comentário, contra o que eu fiz:
--   "Uma terceira lista de pendências na casa seria uma lista que ninguém olha."
--
-- Decisão do dono em 21/09: reusar a fila que existe. O ✈ do mapa grava em
-- `xperf_demandas` com origem 'mapa' — coluna livre, sem CHECK, então isto NÃO
-- precisa de nenhuma alteração de schema. Sobrou só o mapa.

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
ALTER TABLE public.mapas_mentais ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mapas_mentais FROM anon, authenticated;

COMMENT ON TABLE public.mapas_mentais IS
  'Mapa mental por pessoa; nos em jsonb. Leitura so por service role, via funcao com guarda de dono.';
