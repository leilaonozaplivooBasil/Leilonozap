-- ⭐ ATALHO DA TOP COLLEGE NO CABEÇALHO — 23/09/2026
-- Pra onde o ícone do cabeçalho leva esta pessoa dentro do Compromisso
-- (jornada | lista | quadro | mapa | demandas). Nulo = padrão (jornada).
-- A pessoa fixa pela estrela na faixa de visão; o aparelho guarda também
-- (localStorage) e o perfil manda quando os dois discordam.
-- Regra e URL: src/lib/atalhoTopCollege.js
alter table public.metodo_perfil add column if not exists atalho_destino text;
