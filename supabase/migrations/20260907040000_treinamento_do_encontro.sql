-- 🎓 DIR-79 — O TREINAMENTO DE 45 MINUTOS PASSA A EXISTIR (dono, 06/09/2026):
-- "organizar essa parte de treinamento, pra importar o treinamento ou fazer um
-- treinamento ali."
--
-- Até aqui o encontro guardava só `treinamento_por_nome` — o NOME de quem
-- treina. O bloco de 45 minutos aparecia na tela sem nada dentro: não havia o
-- que importar, e não havia o que abrir na hora de apresentar. O tema que
-- aparecia era escrito pela IA junto com o resto do roteiro, e sumia a cada
-- nova geração.
--
-- Agora o treinamento é conteúdo próprio do encontro, e sobrevive a qualquer
-- regeração do roteiro:
--   { titulo, material, passos: [], por }
-- material = link do treinamento OU o texto colado; passos = o passo a passo.
ALTER TABLE public.xperf_encontros
  ADD COLUMN IF NOT EXISTS treinamento JSONB;

COMMENT ON COLUMN public.xperf_encontros.treinamento IS
  'DIR-79: o treinamento de 45 min como conteúdo do encontro — {titulo, material (link ou texto), passos[], por}. Independe do roteiro gerado pela IA.';
