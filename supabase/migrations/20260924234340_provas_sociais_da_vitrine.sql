-- 🏆 PROVAS SOCIAIS DA VITRINE DE LEILÕES (24/09/2026)
--
-- ⚠️ O NÚMERO DESTE ARQUIVO (20260924234340) É O QUE O BANCO REGISTROU —
-- aplicada pela API de gestão do Supabase, que carimba a hora da aplicação.
--
-- Dono: "carrossel de alerta com lances recentes acima da lista de leilões
-- ativos" e "provas sociais de arrematados + ranking dos maiores arrematadores"
-- — com a régua combinada: primeiro nome + inicial, equipe interna fora do
-- ranking, ranking por QUANTIDADE (sem R$).
--
-- Três views prontas pra vitrine (anon lê), com o NOME JÁ MASCARADO no banco:
-- a página nunca recebe o nome completo de quem deu lance ou arrematou.
-- Sem security_invoker de propósito: a exclusão da equipe olha
-- xgame_participantes e app_users.role, que o anônimo não enxerga; a view
-- devolve só agregados e nomes mascarados, nada sensível.
--
-- (nome_publico foi refeita logo em seguida em
-- 20260924…_nome_publico_sem_particulas.sql: a inicial pula "de/da/do".)

create or replace function public.nome_publico(nome text)
returns text language sql immutable as $$
  select case when s.p1 = '' then 'Participante'
              when s.p2 = '' then s.p1
              else s.p1 || ' ' || upper(left(s.p2, 1)) || '.' end
    from (select initcap(split_part(regexp_replace(btrim(coalesce(nome, '')), '\s+', ' ', 'g'), ' ', 1)) as p1,
                 split_part(regexp_replace(btrim(coalesce(nome, '')), '\s+', ' ', 'g'), ' ', 2) as p2) s
$$;

-- quem é "equipe interna": admins, quem joga o X-Game, contas de empresa pelo nome
-- (a mesma leitura de pareceConta em src/lib/timeCorporativo.js)
create or replace view public.vw_equipe_interna as
  select u.id
    from app_users u
   where u.role in ('admin', 'super_admin', 'admin_financeiro', 'leiloeiro')
      or exists (select 1 from xgame_participantes x where x.user_id = u.id)
      or u.full_name ~* '\m(site oficial|oficial|distribuidor|distribuidora|loja|live|canal|ltda|holding|franquia|unidade|filial|matriz|equipe|time|suporte|financeiro|admin)\M'
      or u.full_name ~ '\s[–—-]\s';

create or replace view public.vw_arremates_publicos as
  select a.id,
         a.title as titulo,
         public.nome_publico(a.winner_name) as arrematante,
         a.end_time as quando,
         case when jsonb_typeof(a.image_urls) = 'array' then a.image_urls->>0 end as imagem
    from auctions a
   where a.status in ('ended', 'sold') and a.winner_id is not null
     and coalesce(a.is_test_auction, false) = false and coalesce(a.is_investment_plan, false) = false
     and a.title !~* '\mplano\M'
     and a.winner_id not in (select id from public.vw_equipe_interna)
   order by a.end_time desc nulls last
   limit 12;

create or replace view public.vw_ranking_arrematadores as
  select a.winner_id as id,
         public.nome_publico(max(a.winner_name)) as arrematante,
         count(*)::int as arremates,
         max(a.end_time) as ultimo
    from auctions a
   where a.status in ('ended', 'sold') and a.winner_id is not null
     and coalesce(a.is_test_auction, false) = false and coalesce(a.is_investment_plan, false) = false
     and a.title !~* '\mplano\M'
     and a.winner_id not in (select id from public.vw_equipe_interna)
   group by a.winner_id
   order by arremates desc, ultimo desc
   limit 10;

create or replace view public.vw_lances_publicos as
  select m.id,
         m.auction_id,
         a.title as titulo,
         public.nome_publico(m.sender_name) as participante,
         m.bid_amount as valor,
         coalesce(m.created_date, m.created_at) as quando
    from auction_messages m
    join auctions a on a.id = m.auction_id
   where m.message_type = 'bid' and coalesce(m.is_system_message, false) = false and m.bid_amount > 0
     and a.status in ('active', 'scheduled', 'paused')
     and coalesce(a.is_test_auction, false) = false
   order by quando desc nulls last
   limit 30;

grant select on public.vw_arremates_publicos to anon, authenticated;
grant select on public.vw_ranking_arrematadores to anon, authenticated;
grant select on public.vw_lances_publicos to anon, authenticated;
grant execute on function public.nome_publico(text) to anon, authenticated;
-- vw_equipe_interna é peça interna das outras: NÃO recebe grant pro anônimo.
revoke all on public.vw_equipe_interna from anon, authenticated;
