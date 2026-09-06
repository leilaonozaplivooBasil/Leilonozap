-- 🗂️ DIR-76.2 (06/09/2026) — a lista ganha CARA e FICHA.
--
-- Duas ordens do dono, na mesma rodada:
--
-- 1. "Precisa selecionar emoji, tem que dar tudo isso pra ele, o arrastar de um
--    lado pro outro; quando eu adicionar a lista, precisa ficar igual as
--    outras." — é o painel "Ícone de seção" do MeisterTask (print dele): grade
--    de ícones + fileira de cores. Guarda-se o NOME do ícone, nunca o desenho:
--    o desenho é do pacote de ícones e pode mudar de versão; o nome é nosso.
--
-- 2. "Quando eu escrever Academia, ele traz um espaço pro peso, pra foto, faz a
--    entrevista — perder ou ganhar peso — e já gera a rotina de treino da
--    semana." — a `ficha` é esse questionário respondido, em JSONB: cada
--    assistente tem perguntas próprias (academia pergunta peso e objetivo;
--    financeiro perguntaria outra coisa), e um assistente novo é uma entrada em
--    src/lib/assistenteDeLista.js — não uma migração.
ALTER TABLE public.metodo_quadro_listas
  ADD COLUMN IF NOT EXISTS icone TEXT
  , ADD COLUMN IF NOT EXISTS ficha JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.metodo_quadro_listas.icone IS
  'DIR-76.2: NOME do ícone escolhido (ver ICONES_LISTA em src/lib/quadroCompromisso.js). NULL = deduzido do nome da lista.';
COMMENT ON COLUMN public.metodo_quadro_listas.ficha IS
  'DIR-76.2: as respostas da entrevista do assistente da lista (ex.: academia → objetivo, dias, peso, foto). {} = sem assistente.';
