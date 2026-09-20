-- 🔢 A VITRINE GANHA UMA ORDEM QUE ALGUÉM ESCOLHEU.
--
-- Até aqui quem definia a ordem dos cards de categoria na home era o VOLUME de
-- leilão ativo. Isso muda todo dia: uma categoria entrava e saía da vitrine
-- entre uma visita e outra do mesmo cliente. Não é vitrine, é sorteio.
--
-- `categories.sort_order` já existia e não era usado por ninguém (medido em
-- 20/09: 5 linhas preenchidas, com 2 valores distintos). Passa a ser a régua:
-- quem tem número aparece primeiro, na ordem escolhida; quem não tem entra
-- depois, aí sim por volume.
--
-- Mudança ADITIVA: a view só ganha uma coluna. Quem lê as antigas não quebra.
create or replace view public.vw_home_categorias
with (security_invoker = on) as
  with raiz as (
    select c.id as cat_id, coalesce(c.parent_category_id, c.id) as raiz_id
      from categories c
  )
  select m.id,
         m.name as nome,
         m.image_url as imagem,
         m.sort_order as ordem,
         count(distinct a.id) filter (where a.status = 'active' and a.end_time > now()) as leiloes_ativos,
         count(distinct p.id) filter (where p.catalog_active) as produtos_na_loja
    from categories m
    join raiz on raiz.raiz_id = m.id
    join products p on p.category_id = raiz.cat_id
    left join auctions a on a.product_id = p.id
   where m.parent_category_id is null and m.is_active
   group by m.id, m.name, m.image_url, m.sort_order;

grant select on public.vw_home_categorias to anon, authenticated;
