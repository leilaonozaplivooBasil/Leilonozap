-- 🏦 CONCILIAÇÃO COM O MERCADO PAGO (03/10/2026, DIR-195)
--
-- Dono, com o extrato do Mercado Pago na mão: "tem cliente que depositou e
-- depois veio 'cancelamento de liberação de dinheiro'. Preciso de uma auditoria
-- muito grave: o dinheiro que entra, sai e fica tem que bater real, em tempo
-- real, com lista de quem contestou pra gente ligar. Preciso ser uma extensão
-- do Mercado Pago com uma comunicação mais clara."
--
-- O caso que abriu isto: Diogo dos Santos da Costa, 4 PIX em 02/10 (R$ 3.300),
-- os 4 "cancelados" no Mercado Pago às 18h21 do mesmo dia. O webhook recebeu os
-- 4 avisos, consultou o pagamento, viu "approved" e não fez nada — o dinheiro
-- saiu da conta da empresa e os R$ 3.300 seguiam disponíveis na carteira dele.
--
-- O que nasce aqui:
--   1. catalog_sales.gateway — o que o Mercado Pago DIZ sobre aquele pagamento,
--      conferido pelo servidor (status, liberação do dinheiro, devolução,
--      contestação) e a "situacao" resumida. Só o servidor grava.
--   2. gateway_eventos — TODO aviso que o webhook recebe, antes de qualquer
--      decisão. Nunca mais um aviso passa invisível.
--   3. bloquear_saldo_contestado / liberar_saldo_contestado — trava (e
--      destrava) o saldo de um depósito cujo dinheiro o gateway segurou ou
--      devolveu. Append-only no wallet_ledger, idempotente por venda.
--   4. painel_conciliacao — os totais e a lista de pendências que o Painel do
--      Investidor mostra: o que bate, o que não bate, quem ligar.

-- ── 1. o que o gateway diz ─────────────────────────────────────────────────
alter table public.catalog_sales
  add column if not exists gateway jsonb;

comment on column public.catalog_sales.gateway is
  'DIR-195: o que o Mercado Pago diz sobre o pagamento, conferido pelo servidor: {situacao, status, status_detail, money_release_status, valor, liquido, devolvido, chargeback, disputa, conferido_em, fonte}. situacao: liberado | retido | devolvido | devolvido_parcial | chargeback | disputa | cancelado | pendente | desconhecido.';

create index if not exists catalog_sales_gateway_situacao_idx
  on public.catalog_sales ((gateway->>'situacao'));

-- ── 2. todo aviso do gateway, registrado antes de qualquer decisão ─────────
create table if not exists public.gateway_eventos (
  id            uuid primary key default gen_random_uuid(),
  recebido_em   timestamptz not null default now(),
  gateway       text not null default 'mercado_pago',
  topico        text,            -- payment | chargebacks | claims | merchant_order | ...
  acao          text,            -- payment.updated, chargebacks.created...
  recurso_id    text,            -- o id que veio no aviso (pagamento, chargeback, claim)
  payment_id    text,            -- o pagamento resolvido (quando deu pra resolver)
  sale_id       text,
  formato       text,            -- webhook_v1 | ipn_feed_v2
  assinatura    text,            -- conferida | nao_conferida | ausente
  status        text,            -- status do pagamento no gateway, na hora
  situacao      text,            -- a situacao resumida (mesma regua da coluna gateway)
  resultado     text,            -- o que o webhook fez: creditado | ja_pago | estornado | bloqueado | ignorado | erro...
  corpo         jsonb            -- o aviso bruto (sem cabecalhos)
);
create index if not exists gateway_eventos_recebido_idx on public.gateway_eventos (recebido_em desc);
create index if not exists gateway_eventos_payment_idx on public.gateway_eventos (payment_id);
revoke all on table public.gateway_eventos from public, anon, authenticated;
grant all on table public.gateway_eventos to service_role;
comment on table public.gateway_eventos is
  'DIR-195: todo aviso recebido do gateway (webhook), registrado ANTES de qualquer decisao. Só o servidor lê e grava.';

-- ── 3. travar / destravar saldo contestado ─────────────────────────────────
-- Idempotente pela ÚLTIMA linha do extrato daquela venda: se a última é um
-- bloqueio, não bloqueia de novo. Um bloqueio e uma liberação por venda (índices
-- únicos): bloquear de novo depois de liberar devolve 'ja_houve_bloqueio_antes'
-- — aí é ajuste manual, com rastro, não automático.
create unique index if not exists wallet_ledger_bloqueio_contestacao_uq
  on public.wallet_ledger (sale_id) where tipo = 'bloqueio_contestacao';
create unique index if not exists wallet_ledger_liberacao_contestacao_uq
  on public.wallet_ledger (sale_id) where tipo = 'liberacao_contestacao';
-- Tira de saldo_disponivel o que ainda estiver lá (nunca deixa negativo). Se a
-- pessoa já gastou parte, bloqueia o que sobrou e o resto volta em "nao_recuperado".
create or replace function public.bloquear_saldo_contestado(
  _sale_id text, _motivo text default null, _origem text default 'conciliacao'
) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  _s record; _antes numeric; _bloqueado numeric; _faltou numeric; _ultimo text;
begin
  select id, buyer_id, kind, status, coalesce(total_amount, sale_price, 0)::numeric as valor
    into _s from public.catalog_sales where id = _sale_id;
  if not found then return jsonb_build_object('success', false, 'error', 'venda_nao_encontrada'); end if;
  if _s.kind not in ('wallet_deposit') then
    return jsonb_build_object('success', false, 'error', 'nao_e_deposito_na_carteira', 'kind', _s.kind);
  end if;
  select tipo into _ultimo from public.wallet_ledger
   where sale_id = _sale_id and tipo in ('bloqueio_contestacao', 'liberacao_contestacao')
   order by created_at desc limit 1;
  if _ultimo = 'bloqueio_contestacao' then
    return jsonb_build_object('success', true, 'ja_bloqueado', true, 'bloqueado', 0);
  end if;
  select coalesce(saldo_disponivel, 0) into _antes from public.app_users where id = _s.buyer_id for update;
  if _antes is null then return jsonb_build_object('success', false, 'error', 'comprador_nao_encontrado'); end if;
  _bloqueado := least(_antes, _s.valor);
  _faltou := round(_s.valor - _bloqueado, 2);
  update public.app_users set saldo_disponivel = round(_antes - _bloqueado, 2) where id = _s.buyer_id;
  insert into public.wallet_ledger (user_id, sale_id, tipo, valor, saldo_antes, saldo_depois, motivo, origem)
  values (_s.buyer_id, _sale_id, 'bloqueio_contestacao', -_bloqueado, _antes, round(_antes - _bloqueado, 2),
          coalesce(_motivo, 'Depósito contestado no gateway: saldo bloqueado até a resolução'), _origem);
  return jsonb_build_object('success', true, 'sale_id', _sale_id, 'user_id', _s.buyer_id,
    'valor', round(_s.valor, 2), 'bloqueado', round(_bloqueado, 2), 'nao_recuperado', _faltou,
    'saldo_antes', round(_antes, 2), 'saldo_depois', round(_antes - _bloqueado, 2));
exception when unique_violation then
  return jsonb_build_object('success', false, 'error', 'ja_houve_bloqueio_antes', 'sale_id', _sale_id);
end;
$$;

create or replace function public.liberar_saldo_contestado(
  _sale_id text, _motivo text default null, _origem text default 'conciliacao'
) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  _b record; _antes numeric;
begin
  select user_id, tipo, -valor as valor into _b from public.wallet_ledger
   where sale_id = _sale_id and tipo in ('bloqueio_contestacao', 'liberacao_contestacao')
   order by created_at desc limit 1;
  if not found or _b.tipo <> 'bloqueio_contestacao' then
    return jsonb_build_object('success', false, 'error', 'sem_bloqueio_ativo');
  end if;
  select coalesce(saldo_disponivel, 0) into _antes from public.app_users where id = _b.user_id for update;
  update public.app_users set saldo_disponivel = round(_antes + _b.valor, 2) where id = _b.user_id;
  insert into public.wallet_ledger (user_id, sale_id, tipo, valor, saldo_antes, saldo_depois, motivo, origem)
  values (_b.user_id, _sale_id, 'liberacao_contestacao', _b.valor, _antes, round(_antes + _b.valor, 2),
          coalesce(_motivo, 'Contestação resolvida a favor da empresa: saldo liberado'), _origem);
  return jsonb_build_object('success', true, 'sale_id', _sale_id, 'user_id', _b.user_id, 'liberado', round(_b.valor, 2));
end;
$$;

revoke all on function public.bloquear_saldo_contestado(text, text, text) from public, anon, authenticated;
revoke all on function public.liberar_saldo_contestado(text, text, text) from public, anon, authenticated;
grant execute on function public.bloquear_saldo_contestado(text, text, text) to service_role;
grant execute on function public.liberar_saldo_contestado(text, text, text) to service_role;

-- ── 4. o painel: o que bate, o que não bate, quem ligar ────────────────────
-- Divergência = o que o NOSSO status diz contra o que o GATEWAY diz:
--   dinheiro_saiu        pago aqui; lá retido/devolvido/chargeback/disputa
--   pago_nao_creditado   cancelado aqui; lá aprovado e liberado
--   pago_sem_pagamento   pago aqui; lá cancelado/pendente/recusado
--   nao_conferido        ainda não consultado no gateway
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
        when status = any(_pagos) and gateway->>'situacao' in ('retido','devolvido','devolvido_parcial','chargeback','disputa') then 'dinheiro_saiu'
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
        'valor', round(v, 2), 'situacao', sit, 'divergencia', div,
        'gateway', gateway - 'bruto',
        'nome', buyer_name, 'buyer_id', buyer_id,
        'telefone', (select phone from public.app_users u where u.id = g.buyer_id),
        'email', coalesce(buyer_email, (select email from public.app_users u where u.id = g.buyer_id)),
        'saldo_disponivel', (select round(coalesce(saldo_disponivel, 0), 2) from public.app_users u where u.id = g.buyer_id),
        'bloqueado', (select round(coalesce(-sum(valor), 0), 2) from public.wallet_ledger w
                       where w.sale_id = g.id and w.tipo in ('bloqueio_contestacao', 'liberacao_contestacao'))
      ) order by coalesce((gateway->>'conferido_em')::timestamptz, created_at) desc), '[]'::jsonb)
      from g where div <> 'ok' and div <> 'nao_conferido')
  into totais, divergencias, pendencias;

  select jsonb_build_object(
    'ultimas_24h', count(*) filter (where recebido_em >= now() - interval '24 hours'),
    'ultimo', max(recebido_em),
    'por_resultado_24h', (select coalesce(jsonb_object_agg(resultado, n), '{}'::jsonb)
      from (select coalesce(resultado, '?') resultado, count(*) n from public.gateway_eventos where recebido_em >= now() - interval '24 hours' group by 1) x),
    'ultimos', (select coalesce(jsonb_agg(jsonb_build_object('quando', recebido_em, 'topico', topico, 'payment_id', payment_id, 'status', status, 'situacao', situacao, 'resultado', resultado) order by recebido_em desc), '[]'::jsonb)
      from (select * from public.gateway_eventos order by recebido_em desc limit 12) e))
  into eventos from public.gateway_eventos;

  select jsonb_build_object(
    'total', count(*),
    'conferidos', count(*) filter (where gateway is not null),
    'ultima', max((gateway->>'conferido_em')::timestamptz),
    'mais_antiga', min((gateway->>'conferido_em')::timestamptz) filter (where gateway is not null))
  into conferencia from public.catalog_sales where mp_payment_id is not null;

  return jsonb_build_object('gerado_em', now(), 'por_situacao', coalesce(totais, '{}'::jsonb),
    'divergencias', coalesce(divergencias, '{}'::jsonb), 'pendencias', pendencias,
    'eventos', eventos, 'conferencia', conferencia);
end;
$$;

revoke all on function public.painel_conciliacao() from public, anon, authenticated;
grant execute on function public.painel_conciliacao() to service_role;
