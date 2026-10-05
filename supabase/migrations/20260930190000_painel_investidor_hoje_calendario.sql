-- 📅 PAINEL DO INVESTIDOR · PERÍODOS POR DIA DO CALENDÁRIO (30/09/2026, DIR-193)
-- Dono, com o print: "o Hoje estava em 600, depois 550, agora 50 — o que está
-- acontecendo?". "Hoje" era uma janela móvel de 24 h: conforme a tarde avançava,
-- os depósitos de ontem à tarde saíam da janela e o número caía. Agora "Hoje" é
-- desde a meia-noite de Brasília, "7 dias" e "30 dias" contam dias de calendário
-- (hoje incluído) e "Tudo" segue tudo. Só a linha do _ini muda nas duas funções.

create or replace function public.painel_investidor(_dias integer default 30)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  _hoje_d date := (now() at time zone 'America/Sao_Paulo')::date;
  _hoje timestamptz := (_hoje_d::timestamp) at time zone 'America/Sao_Paulo';
  -- 📅 DIR-193: períodos por DIA DO CALENDÁRIO (fuso de Brasília), não janela móvel.
  -- "Hoje" = desde a meia-noite; "7 dias" = hoje e os 6 anteriores; "30 dias" = hoje e
  -- os 29 anteriores; 0 = tudo. Antes "Hoje" era "últimas 24 h" e o número CAÍA ao
  -- longo do dia conforme os pagamentos de ontem saíam da janela (R$ 600 → 550 → 50).
  _ini timestamptz := case
    when coalesce(_dias, 0) <= 0 then '1970-01-01'::timestamptz
    else (((now() at time zone 'America/Sao_Paulo')::date - (_dias - 1))::timestamp) at time zone 'America/Sao_Paulo' end;
  _pagos text[] := array['paid','pago','entregue','shipped','delivered','preparando','saiu_entrega','confirmado','concluido'];
  _gateway text[] := array['pix_mp','credit_card_mp','pix','card_stripe','credit_card'];
  _ufs text[] := array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  pessoas jsonb; por_dia jsonb; entrada jsonb; fluxo jsonb; compras jsonb; funil jsonb; leilao jsonb; geo jsonb; ultimos jsonb;
begin
  -- 👥 pessoas
  select jsonb_build_object(
    'total', count(*),
    'hoje', count(*) filter (where created_at >= _hoje),
    'd7', count(*) filter (where created_at >= now() - interval '7 days'),
    'd30', count(*) filter (where created_at >= now() - interval '30 days'),
    'periodo', count(*) filter (where created_at >= _ini),
    'ativos_24h', count(*) filter (where last_login >= now() - interval '24 hours'),
    'ativos_7d', count(*) filter (where last_login >= now() - interval '7 days'),
    'com_telefone', count(*) filter (where phone ~ '\d{10,}'))
  into pessoas from app_users where coalesce(is_sample, false) = false;

  select coalesce(jsonb_agg(jsonb_build_object('dia', d, 'n', coalesce(c.n, 0)) order by d), '[]'::jsonb) into por_dia
  from generate_series(_hoje_d - 29, _hoje_d, interval '1 day') g(d)
  left join (
    select (created_at at time zone 'America/Sao_Paulo')::date dia, count(*) n
    from app_users where coalesce(is_sample, false) = false and created_at >= _hoje - interval '29 days' group by 1
  ) c on c.dia = g.d::date;

  -- 💵 dinheiro que entrou pelo gateway (pago, PIX/cartão) — nunca uso de saldo
  with g as (
    select painel_area(kind, source) a, coalesce(total_amount, sale_price, 0)::numeric v, created_at
    from catalog_sales where status = any(_pagos) and payment_method = any(_gateway)
  )
  select jsonb_build_object(
    'total', (select jsonb_build_object('n', count(*), 'valor', round(coalesce(sum(v), 0), 2)) from g),
    'periodo', (select jsonb_build_object('n', count(*), 'valor', round(coalesce(sum(v), 0), 2)) from g where created_at >= _ini),
    'por_area', (select coalesce(jsonb_object_agg(a, jsonb_build_object('n', n, 'valor', valor)), '{}'::jsonb)
                 from (select a, count(*) n, round(sum(v), 2) valor from g where created_at >= _ini group by a) x),
    'por_area_total', (select coalesce(jsonb_object_agg(a, jsonb_build_object('n', n, 'valor', valor)), '{}'::jsonb)
                 from (select a, count(*) n, round(sum(v), 2) valor from g group by a) x),
    'por_mes', (select coalesce(jsonb_agg(jsonb_build_object('mes', mes, 'n', n, 'valor', valor) order by mes), '[]'::jsonb)
                from (select to_char(date_trunc('month', created_at at time zone 'America/Sao_Paulo'), 'YYYY-MM') mes, count(*) n, round(sum(v), 2) valor
                      from g where created_at >= now() - interval '12 months' group by 1) m))
  into entrada;

  -- 🔁 para onde vai o dinheiro depositado
  select jsonb_build_object(
    'depositado', (select round(coalesce(sum(coalesce(total_amount, sale_price, 0)), 0), 2) from catalog_sales where status = any(_pagos) and kind in ('wallet_deposit', 'operacao_deposit')),
    'depositantes', (select count(distinct buyer_id) from catalog_sales where status = any(_pagos) and kind in ('wallet_deposit', 'operacao_deposit')),
    'arremates', (select round(coalesce(sum(coalesce(total_amount, sale_price, 0)), 0), 2) from catalog_sales where status = any(_pagos) and payment_method = 'saldo' and kind = 'arremate'),
    'loja', (select round(coalesce(sum(coalesce(total_amount, sale_price, 0)), 0), 2) from catalog_sales where status = any(_pagos) and payment_method = 'saldo' and painel_area(kind, source) in ('loja', 'pdv')),
    'reservado', (select round(coalesce(sum(saldo_reservado), 0), 2) from app_users),
    'parado', (select round(coalesce(sum(saldo_disponivel), 0), 2) from app_users))
  into fluxo;

  -- 🛒 compras pagas por área (qualquer meio de pagamento)
  with c as (
    select painel_area(kind, source) a, coalesce(total_amount, sale_price, 0)::numeric v, created_at, buyer_id
    from catalog_sales where status = any(_pagos) and painel_area(kind, source) in ('loja', 'pdv', 'arremate', 'nexus')
  )
  select jsonb_build_object(
    'periodo', (select coalesce(jsonb_object_agg(a, jsonb_build_object('n', n, 'valor', valor)), '{}'::jsonb) from (select a, count(*) n, round(sum(v), 2) valor from c where created_at >= _ini group by a) x),
    'total', (select coalesce(jsonb_object_agg(a, jsonb_build_object('n', n, 'valor', valor)), '{}'::jsonb) from (select a, count(*) n, round(sum(v), 2) valor from c group by a) x))
  into compras;

  -- 🧭 funil do período
  with c as (
    select buyer_id, created_at from catalog_sales
    where status = any(_pagos) and painel_area(kind, source) in ('loja', 'pdv', 'arremate') and buyer_id is not null
  ), d as (
    select buyer_id, created_at from catalog_sales where status = any(_pagos) and kind in ('wallet_deposit', 'operacao_deposit') and buyer_id is not null
  )
  select jsonb_build_object(
    'cadastros', (pessoas->>'periodo')::int,
    'depositantes', (select count(distinct buyer_id) from d where created_at >= _ini),
    'compradores', (select count(distinct buyer_id) from c where created_at >= _ini),
    'recompradores', (select count(*) from (select buyer_id from c where created_at >= _ini group by buyer_id having count(*) >= 2) r),
    'cadastros_total', (pessoas->>'total')::int,
    'depositantes_total', (select count(distinct buyer_id) from d),
    'compradores_total', (select count(distinct buyer_id) from c),
    'recompradores_total', (select count(*) from (select buyer_id from c group by buyer_id having count(*) >= 2) r))
  into funil;

  -- 🔨 leilão
  select jsonb_build_object(
    'ativos', (select count(*) from auctions where status = 'active' and coalesce(is_test_auction, false) = false and coalesce(is_sample, false) = false),
    'lances_ativos_valor', (select round(coalesce(sum(current_price), 0), 2) from auctions where status = 'active' and coalesce(is_test_auction, false) = false and coalesce(is_sample, false) = false),
    'lances_24h', (select count(*) from auction_messages m join auctions a on a.id = m.auction_id
                   where m.message_type = 'bid' and coalesce(m.is_system_message, false) = false and m.bid_amount > 0
                     and coalesce(a.is_test_auction, false) = false and coalesce(m.created_date, m.created_at) >= now() - interval '24 hours'),
    'arremates_pagos', (select jsonb_build_object('n', count(*), 'valor', round(coalesce(sum(coalesce(total_amount, sale_price, 0)), 0), 2)) from catalog_sales where status = any(_pagos) and kind = 'arremate' and created_at >= _ini),
    'arremates_pagos_total', (select jsonb_build_object('n', count(*), 'valor', round(coalesce(sum(coalesce(total_amount, sale_price, 0)), 0), 2)) from catalog_sales where status = any(_pagos) and kind = 'arremate'),
    'aguardando_pagamento', (select jsonb_build_object('n', count(*), 'valor_nominal', round(coalesce(sum(current_price), 0), 2)) from auctions
                             where status in ('ended', 'sold') and order_status = 'awaiting_payment' and coalesce(is_test_auction, false) = false and coalesce(is_sample, false) = false))
  into leilao;

  -- 🗺️ geografia: estado do endereço quando é sigla válida; senão, DDD do telefone
  with u as (
    select case when upper(trim(address_state)) = any(_ufs) then upper(trim(address_state))
                else painel_ddd_uf(substring(regexp_replace(coalesce(phone, ''), '\D', '', 'g') from '^(?:55)?(\d{2})')) end uf,
           created_at
    from app_users where coalesce(is_sample, false) = false
  )
  select jsonb_build_object(
    'por_uf', (select coalesce(jsonb_agg(jsonb_build_object('uf', uf, 'n', n, 'periodo', np) order by n desc), '[]'::jsonb)
               from (select uf, count(*) n, count(*) filter (where created_at >= _ini) np from u where uf is not null group by uf) x),
    'sem_localizacao', (select count(*) from u where uf is null))
  into geo;

  -- ⚡ últimos pagamentos aprovados (ticker ao vivo)
  select coalesce(jsonb_agg(jsonb_build_object('quando', created_at, 'area', painel_area(kind, source), 'valor', round(coalesce(total_amount, sale_price, 0)::numeric, 2),
                                               'nome', split_part(coalesce(buyer_name, ''), ' ', 1)) order by created_at desc), '[]'::jsonb)
  into ultimos
  from (select * from catalog_sales where status = any(_pagos) and payment_method = any(_gateway) order by created_at desc limit 8) s;

  return jsonb_build_object(
    'gerado_em', now(), 'dias', _dias, 'hoje', _hoje_d,
    'pessoas', pessoas || jsonb_build_object('por_dia', por_dia),
    'entrada', entrada, 'fluxo_deposito', fluxo, 'compras', compras, 'funil', funil, 'leilao', leilao, 'geografia', geo, 'ultimos', ultimos);
end;
$$;


create or replace function public.painel_investidor_perfil(_dias integer default 30)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  -- 📅 DIR-193: períodos por DIA DO CALENDÁRIO (fuso de Brasília), não janela móvel.
  -- "Hoje" = desde a meia-noite; "7 dias" = hoje e os 6 anteriores; "30 dias" = hoje e
  -- os 29 anteriores; 0 = tudo. Antes "Hoje" era "últimas 24 h" e o número CAÍA ao
  -- longo do dia conforme os pagamentos de ontem saíam da janela (R$ 600 → 550 → 50).
  _ini timestamptz := case
    when coalesce(_dias, 0) <= 0 then '1970-01-01'::timestamptz
    else (((now() at time zone 'America/Sao_Paulo')::date - (_dias - 1))::timestamp) at time zone 'America/Sao_Paulo' end;
  genero jsonb; canais jsonb;
begin
  with u as (select painel_genero(full_name) g, created_at from app_users where coalesce(is_sample, false) = false)
  select jsonb_build_object(
    'masculino', count(*) filter (where g = 'masculino'),
    'feminino', count(*) filter (where g = 'feminino'),
    'indefinido', count(*) filter (where g = 'indefinido'),
    'periodo', jsonb_build_object(
      'masculino', count(*) filter (where g = 'masculino' and created_at >= _ini),
      'feminino', count(*) filter (where g = 'feminino' and created_at >= _ini),
      'indefinido', count(*) filter (where g = 'indefinido' and created_at >= _ini)),
    'metodo', 'estimado pelo primeiro nome')
  into genero from u;

  with u as (select painel_canal(origem_trafego, referred_by_id) c, created_at from app_users where coalesce(is_sample, false) = false)
  select jsonb_build_object(
    'lista', (select coalesce(jsonb_agg(jsonb_build_object('canal', c, 'n', n, 'periodo', np) order by n desc), '[]'::jsonb)
              from (select c, count(*) n, count(*) filter (where created_at >= _ini) np from u group by c) x),
    'registro_desde', (select min(created_at)::date from app_users where origem_trafego is not null),
    'com_registro', (select count(*) from app_users where origem_trafego is not null and coalesce(is_sample, false) = false))
  into canais from u limit 1;

  return jsonb_build_object('genero', genero, 'canais', canais, 'idade', null);
end;
$$;

