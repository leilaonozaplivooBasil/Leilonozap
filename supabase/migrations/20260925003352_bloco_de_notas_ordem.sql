-- 📝 O BLOCO DE NOTAS ganha ordem própria (25/09/2026)
--
-- ⚠️ O NÚMERO DESTE ARQUIVO (20260925003352) É O QUE O BANCO REGISTROU.
--
-- Dono: "deve ser possível arrastar as notas e editá-las". Arrastar é
-- reordenar; reordenar precisa de um número que sobreviva ao reload. A ordem
-- vale só dentro do bloco (origem 'bloco') — a aba Demandas, o Encontro e o
-- Painel continuam lendo created_at como sempre. Coluna nova, nula por
-- padrão: nada que existe muda de lugar até alguém arrastar.
alter table public.xperf_demandas
  add column if not exists ordem_bloco smallint;

comment on column public.xperf_demandas.ordem_bloco is
  'Ordem escolhida à mão no bloco de notas (botão D). Nulo = ordem por created_at.';
