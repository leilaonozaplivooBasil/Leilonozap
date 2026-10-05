-- 🧾 CANCELAMENTO COM RASTRO · PAINEL PELO VALOR DO GATEWAY · CONFERÊNCIA NÃO MEXE NA DATA (03/10/2026, DIR-197)
--
-- Dono, depois da auditoria caso a caso dos "pago no gateway, cancelado aqui":
-- "pode fazer tudo que precisa fazer".
--
-- O que a auditoria mostrou:
--   • O sistema não guardava QUEM cancelou um pedido nem QUANDO. A única pista
--     era updated_at — e a conferência do gateway (DIR-195), ao gravar a coluna
--     gateway, atualizou a updated_at de 285 vendas para 18h22 de 03/10. Pista perdida.
--   • Nosso campo de valor da venda guarda só o produto; o Mercado Pago cobra
--     produto + frete (loja) e, no cartão, +4,99% repassado ao cliente. Resultado:
--     o painel "Entrou pelo gateway" ficava R$ 730 abaixo do que o gateway cobrou.
--   • Duas vendas do Gabriel (R$ 2 cada, 26/07) foram canceladas antes de 20/08,
--     quando cancelar ainda não estornava comissão: R$ 1,18 de comissão seguia como
--     paga. Estornado hoje por cancelar_venda (feito à parte, não é migração).
--
-- 1. updated_at da venda não muda quando SÓ a coluna gateway muda.
create or replace function public.catalog_sales_set_updated_at()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if (to_jsonb(new) - 'gateway' - 'updated_at') = (to_jsonb(old) - 'gateway' - 'updated_at') then
    new.updated_at := old.updated_at;
    return new;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create or replace trigger trg_catalog_sales_updated_at
  before update on public.catalog_sales for each row execute function public.catalog_sales_set_updated_at();

-- 2. Quem cancelou, quando e por quê. A hora é carimbada por trigger na transição
--    de status (qualquer caminho); autor e motivo vêm da rota que cancelou
--    (updateOrderStatus, excluirMeuPedido, mpWebhook) — fora do grant do anônimo.
alter table public.catalog_sales
  add column if not exists cancelado_em timestamptz,
  add column if not exists cancelado_por text,
  add column if not exists cancelamento_motivo text;
comment on column public.catalog_sales.cancelado_em is 'DIR-197: quando a venda entrou em cancelado (carimbado por trigger na transição de status). Só o servidor grava.';
comment on column public.catalog_sales.cancelado_por is 'DIR-197: quem cancelou (id do admin/vendedor/comprador, ou mercado_pago/sistema). Gravado pela rota que cancelou.';

create or replace function public.catalog_sales_carimba_cancelamento()
returns trigger language plpgsql set search_path to 'public' as $$
declare _cancel text[] := array['cancelado','canceled','cancelled'];
begin
  if new.status = any(_cancel) and (old.status is null or old.status <> all(_cancel)) and new.cancelado_em is null then
    new.cancelado_em := now();
  end if;
  return new;
end;
$$;
create or replace trigger trg_catalog_sales_cancelamento
  before update on public.catalog_sales for each row execute function public.catalog_sales_carimba_cancelamento();

-- 3. painel_investidor: "Entrou pelo gateway" pelo valor que o gateway COBROU
--    (gateway.valor) quando a venda já foi conferida; senão, o nosso campo.
--    Líquido, taxa e quantos já foram conferidos vão junto. fluxo_deposito ganha
--    'bloqueado' (contestações). O resto da função é igual à 20260930190000.
create or replace function public.painel_investidor(_dias integer default 30)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  _hoje_d date := (now() at time zone 'America/Sao_Paulo')::date;
  _hoje timestamptz := (_hoje_d::timestamp) at time zone 'America/Sao_Paulo';
  _ini timestamptz := case
    when coalesce(_dias, 0) <= 0 then '1970-01-01'::timestamptz
    else (((now() at time zone 'America/Sao_Paulo')::date - (_dias - 1))::timestamp) at time zone 'America/Sao_Paulo' end;
  _pagos text[] := array['paid','pago','entregue','shipped','delivered','preparando','saiu_entrega','confirmado','concluido'];
  _gateway text[] := array['pix_mp','credit_card_mp','pix','card_stripe','credit_card'];
  _ufs text[] := array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  pessoas jsonb; por_dia jsonb; entrada jsonb; fluxo jsonb; compras jsonb; funil jsonb; leilao jsonb; geo jsonb; ultimos jsonb;
begin
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

  with g as (
    select painel_area(kind, source) a,
      coalesce((gateway->>'valor')::numeric, coalesce(total_amount, sale_price, 0))::numeric v,
      coalesce((gateway->>'liquido')::numeric, 0)::numeric liq,
      coalesce((gateway->>'taxa')::numeric, 0)::numeric taxa,
      (gateway is not null) conferido,
      created_at
    from catalog_sales where status = any(_pagos) and payment_method = any(_gateway)
  )
  select jsonb_build_object(
    'total', (select jsonb_build_object('n', count(*), 'valor', round(coalesce(sum(v), 0), 2), 'liquido', round(coalesce(sum(liq), 0), 2), 'taxa', round(coalesce(sum(taxa), 0), 2), 'conferidos', count(*) filter (where conferido)) from g),
    'periodo', (select jsonb_build_object('n', count(*), 'valor', round(coalesce(sum(v), 0), 2), 'liquido', round(coalesce(sum(liq), 0), 2), 'taxa', round(coalesce(sum(taxa), 0), 2), 'conferidos', count(*) filter (where conferido)) from g where created_at >= _ini),
    'por_area', (select coalesce(jsonb_object_agg(a, jsonb_build_object('n', n, 'valor', valor)), '{}'::jsonb)
                 from (select a, count(*) n, round(sum(v), 2) valor from g where created_at >= _ini group by a) x),
    'por_area_total', (select coalesce(jsonb_object_agg(a, jsonb_build_object('n', n, 'valor', valor)), '{}'::jsonb)
                 from (select a, count(*) n, round(sum(v), 2) valor from g group by a) x),
    'por_mes', (select coalesce(jsonb_agg(jsonb_build_object('mes', mes, 'n', n, 'valor', valor) order by mes), '[]'::jsonb)
                from (select to_char(date_trunc('month', created_at at time zone 'America/Sao_Paulo'), 'YYYY-MM') mes, count(*) n, round(sum(v), 2) valor
                      from g where created_at >= now() - interval '12 months' group by 1) m))
  into entrada;

  select jsonb_build_object(
    'depositado', (select round(coalesce(sum(coalesce(total_amount, sale_price, 0)), 0), 2) from catalog_sales where status = any(_pagos) and kind in ('wallet_deposit', 'operacao_deposit')),
    'depositantes', (select count(distinct buyer_id) from catalog_sales where status = any(_pagos) and kind in ('wallet_deposit', 'operacao_deposit')),
    'arremates', (select round(coalesce(sum(coalesce(total_amount, sale_price, 0)), 0), 2) from catalog_sales where status = any(_pagos) and payment_method = 'saldo' and kind = 'arremate'),
    'loja', (select round(coalesce(sum(coalesce(total_amount, sale_price, 0)), 0), 2) from catalog_sales where status = any(_pagos) and payment_method = 'saldo' and painel_area(kind, source) in ('loja', 'pdv')),
    'reservado', (select round(coalesce(sum(saldo_reservado), 0), 2) from app_users),
    'parado', (select round(coalesce(sum(saldo_disponivel), 0), 2) from app_users),
    'bloqueado', (select round(coalesce(-sum(valor), 0), 2) from wallet_ledger where tipo in ('bloqueio_contestacao', 'liberacao_contestacao')))
  into fluxo;

  with c as (
    select painel_area(kind, source) a, coalesce(total_amount, sale_price, 0)::numeric v, created_at, buyer_id
    from catalog_sales where status = any(_pagos) and painel_area(kind, source) in ('loja', 'pdv', 'arremate', 'nexus')
  )
  select jsonb_build_object(
    'periodo', (select coalesce(jsonb_object_agg(a, jsonb_build_object('n', n, 'valor', valor)), '{}'::jsonb) from (select a, count(*) n, round(sum(v), 2) valor from c where created_at >= _ini group by a) x),
    'total', (select coalesce(jsonb_object_agg(a, jsonb_build_object('n', n, 'valor', valor)), '{}'::jsonb) from (select a, count(*) n, round(sum(v), 2) valor from c group by a) x))
  into compras;

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

  select coalesce(jsonb_agg(jsonb_build_object('quando', created_at, 'area', painel_area(kind, source), 'valor', round(coalesce((gateway->>'valor')::numeric, coalesce(total_amount, sale_price, 0))::numeric, 2),
                                               'nome', split_part(coalesce(buyer_name, ''), ' ', 1)) order by created_at desc), '[]'::jsonb)
  into ultimos
  from (select * from catalog_sales where status = any(_pagos) and payment_method = any(_gateway) order by created_at desc limit 8) s;

  return jsonb_build_object(
    'gerado_em', now(), 'dias', _dias, 'hoje', _hoje_d,
    'pessoas', pessoas || jsonb_build_object('por_dia', por_dia),
    'entrada', entrada, 'fluxo_deposito', fluxo, 'compras', compras, 'funil', funil, 'leilao', leilao, 'geografia', geo, 'ultimos', ultimos);
end;
$$;
