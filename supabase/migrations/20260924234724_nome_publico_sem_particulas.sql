-- 🏷️ nome_publico: a inicial pula as partículas (24/09/2026)
--
-- ⚠️ O NÚMERO DESTE ARQUIVO (20260924234724) É O QUE O BANCO REGISTROU.
--
-- "Rosenberg de Oliveira" saía "Rosenberg D." — a inicial tem que ser do
-- sobrenome, não do "de". Pula de/da/do/dos/das/e/di/del/della/van/von/la/le.
-- (src/lib/provasSociais.js → nomePublico faz a mesma conta na tela.)
create or replace function public.nome_publico(nome text)
returns text language sql immutable as $$
  with partes as (
    select p, ord
      from unnest(string_to_array(regexp_replace(btrim(coalesce(nome, '')), '\s+', ' ', 'g'), ' ')) with ordinality as t(p, ord)
     where p <> ''
  ),
  primeiro as (select initcap(p) as p from partes where ord = 1),
  sobrenome as (
    select p from partes
     where ord > 1 and lower(p) not in ('de', 'da', 'do', 'dos', 'das', 'e', 'di', 'del', 'della', 'van', 'von', 'la', 'le')
     order by ord limit 1
  )
  select case when (select p from primeiro) is null then 'Participante'
              when (select p from sobrenome) is null then (select p from primeiro)
              else (select p from primeiro) || ' ' || upper(left((select p from sobrenome), 1)) || '.' end
$$;
