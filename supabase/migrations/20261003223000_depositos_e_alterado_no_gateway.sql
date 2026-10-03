-- 🧾 DEPÓSITOS E CARTEIRAS, UM POR UM · E O PIX "ALTERADO" NO GATEWAY (03/10/2026, DIR-196)
--
-- Dono, com a conciliação na tela: "preciso de um modal para ver todos os
-- depósitos e entender tudo que a plataforma está falando: qual o momento do
-- dinheiro, a lista de depósitos e, principalmente, quanto de carteira dentro
-- da operação está parado para compra, para eu virar em produto."
--
-- E a lição do dia: os 4 PIX do Diogo voltaram da conferência como "liberado".
-- O Mercado Pago mantém status "approved", liberação "released" e devolução
-- zero — mas carimbou date_last_updated às 18h21, exatamente a hora do
-- "cancelamento de liberação" no extrato. Entre 173 pagamentos liberados, só
-- esses 4 foram alterados depois de aprovados. A régua (api/_lib/
-- conferenciaMercadoPago.js) agora chama isso de "alterado" e trata como
-- dinheiro que saiu até prova em contrário; aqui o painel passa a contar.
--
--   1. painel_depositos — a lista inteira de depósitos com o MOMENTO do
--      dinheiro, as carteiras pessoa a pessoa (depositado, gasto, reservado,
--      parado, bloqueado) e os totais.
--   2. painel_conciliacao — "alterado" entra em dinheiro_saiu; pendências
--      ordenadas pela gravidade; o bruto da investigação fica fora da lista.

create or replace function public.painel_depositos()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  _pagos text[] := array['paid','pago','entregue','shipped','delivered','preparando','saiu_entrega','confirmado','concluido'];
  _cancel text[] := array['cancelado','canceled','cancelled'];
  _saiu text[] := array['retido','devolvido','devolvido_parcial','chargeback','disputa','alterado'];
  depositos jsonb; carteiras jsonb; totais jsonb;
begin
  -- 🧾 cada depósito e o momento do dinheiro dele
  with d as (
    select s.id, s.created_at, s.buyer_id, s.buyer_name, s.kind, s.status, s.payment_method, s.mp_payment_id,
      coalesce(s.total_amount, s.sale_price, 0)::numeric as v, s.gateway,
      (select round(coalesce(-sum(valor), 0), 2) from public.wallet_ledger w where w.sale_id = s.id and w.tipo in ('bloqueio_contestacao', 'liberacao_contestacao')) as bloqueado
    from public.catalog_sales s where s.kind in ('wallet_deposit', 'operacao_deposit')
  ), m as (
    select d.*, case
      when status = any(_cancel) then 'cancelado'
      when status in ('pending_payment', 'pending') then 'aguardando_pagamento'
      when status = any(_pagos) and gateway is null then 'creditado_sem_conferencia'
      when status = any(_pagos) and gateway->>'situacao' = any(_saiu) and bloqueado > 0 then 'bloqueado'
      when status = any(_pagos) and gateway->>'situacao' = any(_saiu) then 'dinheiro_saiu_sem_bloqueio'
      when status = any(_pagos) and gateway->>'situacao' in ('cancelado', 'pendente') then 'creditado_sem_pagamento'
      when status = any(_pagos) then 'creditado'
      else 'outro' end as momento
    from d
  )
  select coalesce(jsonb_agg(jsonb_build_object('sale_id', id, 'quando', created_at, 'buyer_id', buyer_id, 'nome', buyer_name, 'kind', kind, 'status', status, 'meio', payment_method, 'payment_id', mp_payment_id,
    'valor', round(v, 2), 'liquido', (gateway->>'liquido')::numeric, 'situacao', coalesce(gateway->>'situacao', 'nao_conferido'), 'bloqueado', bloqueado, 'momento', momento, 'conferido_em', gateway->>'conferido_em') order by created_at desc), '[]'::jsonb)
  into depositos from m;

  -- 👛 carteiras: quem tem dinheiro parado (é a verba que vira produto)
  with dep as (
    select buyer_id, sum(coalesce(total_amount, sale_price, 0))::numeric as depositado, count(*) as n, max(created_at) as ultimo
    from public.catalog_sales where kind = 'wallet_deposit' and status = any(_pagos) group by buyer_id
  ), gasto as (
    select buyer_id, sum(coalesce(total_amount, sale_price, 0))::numeric as gasto, count(*) as compras
    from public.catalog_sales where payment_method = 'saldo' and status <> all(_cancel) and status <> 'pending_payment' group by buyer_id
  ), bloq as (
    select user_id, -sum(valor) as bloqueado from public.wallet_ledger where tipo in ('bloqueio_contestacao', 'liberacao_contestacao') group by user_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('buyer_id', u.id, 'nome', u.full_name, 'telefone', u.phone, 'email', u.email,
    'depositado', round(d.depositado, 2), 'depositos', d.n, 'gasto', round(coalesce(g.gasto, 0), 2), 'compras', coalesce(g.compras, 0),
    'reservado', round(coalesce(u.saldo_reservado, 0), 2), 'parado', round(coalesce(u.saldo_disponivel, 0), 2), 'bloqueado', round(coalesce(b.bloqueado, 0), 2),
    'ultimo_deposito', d.ultimo, 'ultimo_login', u.last_login) order by coalesce(u.saldo_disponivel, 0) desc, d.depositado desc), '[]'::jsonb)
  into carteiras from dep d join public.app_users u on u.id = d.buyer_id left join gasto g on g.buyer_id = d.buyer_id left join bloq b on b.user_id = d.buyer_id;

  select jsonb_build_object(
    'depositado', (select round(coalesce(sum(coalesce(total_amount, sale_price, 0)), 0), 2) from public.catalog_sales where kind = 'wallet_deposit' and status = any(_pagos)),
    'depositantes', (select count(distinct buyer_id) from public.catalog_sales where kind = 'wallet_deposit' and status = any(_pagos)),
    'gasto', (select round(coalesce(sum(coalesce(total_amount, sale_price, 0)), 0), 2) from public.catalog_sales where payment_method = 'saldo' and status <> all(_cancel) and status <> 'pending_payment'),
    'reservado', (select round(coalesce(sum(saldo_reservado), 0), 2) from public.app_users),
    'parado', (select round(coalesce(sum(saldo_disponivel), 0), 2) from public.app_users),
    'pessoas_com_saldo', (select count(*) from public.app_users where coalesce(saldo_disponivel, 0) > 0),
    'bloqueado', (select round(coalesce(-sum(valor), 0), 2) from public.wallet_ledger where tipo in ('bloqueio_contestacao', 'liberacao_contestacao')),
    'operacao', (select round(coalesce(sum(saldo_operacao), 0), 2) from public.app_users))
  into totais;
  return jsonb_build_object('gerado_em', now(), 'totais', totais, 'carteiras', carteiras, 'depositos', depositos);
end;
$$;
revoke all on function public.painel_depositos() from public, anon, authenticated;
grant execute on function public.painel_depositos() to service_role;

create or replace function public.painel_conciliacao()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  _pagos text[] := array['paid','pago','entregue','shipped','delivered','preparando','saiu_entrega','confirmado','concluido'];
  _cancel text[] := array['cancelado','canceled','cancelled'];
  _gateway text[] := array['pix_mp','credit_card_mp','pix','card_stripe','credit_card'];
  totais jsonb; divergencias jsonb; pendencias jsonb; eventos jsonb; conferencia jsonb;
begin
  with g as (
    select s.*, coalesce(total_amount, sale_price, 0)::numeric as v,
      coalesce(gateway->>'situacao', 'nao_conferido') as sit,
      case
        when gateway is null then 'nao_conferido'
        when status = any(_pagos) and gateway->>'situacao' in ('retido','devolvido','devolvido_parcial','chargeback','disputa','alterado') then 'dinheiro_saiu'
        when status = any(_cancel) and gateway->>'situacao' = 'liberado' then 'pago_nao_creditado'
        when status = any(_pagos) and gateway->>'situacao' in ('cancelado','pendente') then 'pago_sem_pagamento'
        else 'ok' end as div
    from public.catalog_sales s
    where mp_payment_id is not null and (payment_method = any(_gateway) or payment_method is null)
  )
  select
    (select jsonb_object_agg(sit, jsonb_build_object('n', n, 'valor', valor, 'liquido', liquido))
       from (select sit, count(*) n, round(sum(v), 2) valor, round(sum(coalesce((gateway->>'liquido')::numeric, 0)), 2) liquido from g group by sit) x),
    (select jsonb_object_agg(div, jsonb_build_object('n', n, 'valor', valor))
       from (select div, count(*) n, round(sum(v), 2) valor from g group by div) x),
    (select coalesce(jsonb_agg(jsonb_build_object(
        'sale_id', id, 'payment_id', mp_payment_id, 'quando', created_at, 'kind', kind, 'status', status,
        'valor', round(v, 2), 'situacao', sit, 'divergencia', div, 'gateway', gateway - 'bruto' - 'investigacao',
        'nome', buyer_name, 'buyer_id', buyer_id,
        'telefone', (select phone from public.app_users u where u.id = g.buyer_id),
        'email', coalesce(buyer_email, (select email from public.app_users u where u.id = g.buyer_id)),
        'saldo_disponivel', (select round(coalesce(saldo_disponivel, 0), 2) from public.app_users u where u.id = g.buyer_id),
        'bloqueado', (select round(coalesce(-sum(valor), 0), 2) from public.wallet_ledger w where w.sale_id = g.id and w.tipo in ('bloqueio_contestacao', 'liberacao_contestacao'))
      ) order by case div when 'dinheiro_saiu' then 0 when 'pago_sem_pagamento' then 1 else 2 end, coalesce((gateway->>'conferido_em')::timestamptz, created_at) desc), '[]'::jsonb)
      from g where div <> 'ok' and div <> 'nao_conferido')
  into totais, divergencias, pendencias;
  select jsonb_build_object(
    'ultimas_24h', count(*) filter (where recebido_em >= now() - interval '24 hours'),
    'ultimo', max(recebido_em),
    'por_resultado_24h', (select coalesce(jsonb_object_agg(resultado, n), '{}'::jsonb) from (select coalesce(resultado, '?') resultado, count(*) n from public.gateway_eventos where recebido_em >= now() - interval '24 hours' group by 1) x),
    'ultimos', (select coalesce(jsonb_agg(jsonb_build_object('quando', recebido_em, 'topico', topico, 'payment_id', payment_id, 'status', status, 'situacao', situacao, 'resultado', resultado) order by recebido_em desc), '[]'::jsonb) from (select * from public.gateway_eventos order by recebido_em desc limit 12) e))
  into eventos from public.gateway_eventos;
  select jsonb_build_object('total', count(*), 'conferidos', count(*) filter (where gateway is not null),
    'ultima', max((gateway->>'conferido_em')::timestamptz), 'mais_antiga', min((gateway->>'conferido_em')::timestamptz) filter (where gateway is not null))
  into conferencia from public.catalog_sales where mp_payment_id is not null;
  return jsonb_build_object('gerado_em', now(), 'por_situacao', coalesce(totais, '{}'::jsonb), 'divergencias', coalesce(divergencias, '{}'::jsonb), 'pendencias', pendencias, 'eventos', eventos, 'conferencia', conferencia);
end;
$$;
