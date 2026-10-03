-- 🧾 SEGURANÇA REAL NO DEPÓSITO CONTESTADO (03/10/2026, DIR-198)
--
-- Dono: "faz o que é o certo; tira a comissão de quem indicou (o João); segue
-- essas regras pro futuro e organiza o passado. Precisamos ter segurança real nisso."
--
-- O que a conferência mostrou: os 4 PIX do Diogo (R$ 3.300) foram devolvidos
-- ao pagador pelo próprio Mercado Pago em 02/10 18h21, por "suspeita de fraude"
-- (devolução administrativa, escondida do pagamento). O indicador dele, João
-- Vitor Paim, tinha R$ 330 de comissão de indicação a liberar em 09/10 — por
-- dinheiro que a empresa nunca ficou.
--
-- Regra, não exceção:
--   1. estornar_comissoes_do_deposito — cancela o que está a_liberar e estorna o
--      que já estava disponível (sai do saldo de comissão, nunca negativo; o que
--      faltar fica no retorno). Idempotente.
--   2. bloquear_saldo_contestado chama (1) SEMPRE, mesmo se o bloqueio já existia:
--      todo caminho (webhook, cron, botão) que trava o saldo também corta a comissão.
--   3. gateway_acoes — a fila de ações sobre pendências (devolver pelo gateway,
--      marcar resolvida): registrada ANTES de acontecer, executada pelo servidor
--      (botão na hora; cron pega o que ficou), resultado na mesma linha.
--   4. catalog_sales.conciliacao_resolvida_* — a pendência tratada sai da lista
--      com quem, quando e por quê. Pendência "pago lá, cancelado aqui" com
--      devolução na carteira (wallet_ledger estorno_venda) fecha sozinha.
--
-- Passado organizado (feito à parte, não é migração): comissões do João nas 4
-- vendas do Diogo canceladas (R$ 150 + 80 + 50 + 50); fila com devolução dos
-- 2× R$ 2 do Gabriel pelo gateway e com "resolvida" para as compras internas
-- do Luiz e da Sophia; Ronilson fecha sozinho pela regra (4).

create or replace function public.estornar_comissoes_do_deposito(_sale_id text, _motivo text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  _canceladas numeric := 0; _estornadas numeric := 0; _faltou numeric := 0; _n int := 0;
begin
  with c as (
    update public.commission_ledger set status = 'cancelado', released_at = now()
     where sale_id = _sale_id and status = 'a_liberar' returning amount
  ) select coalesce(sum(amount), 0), count(*) into _canceladas, _n from c;
  with liberadas as (
    update public.commission_ledger set status = 'estornado', released_at = now()
     where sale_id = _sale_id and status = 'disponivel' returning beneficiary_id, amount
  ), agg as (select beneficiary_id, sum(amount) amt from liberadas group by beneficiary_id),
  antes as (select a.beneficiary_id, a.amt, coalesce(u.commission_balance, 0) saldo from agg a join public.app_users u on u.id = a.beneficiary_id),
  aplicado as (
    update public.app_users u set commission_balance = round(greatest(0, an.saldo - an.amt), 2)
      from antes an where u.id = an.beneficiary_id returning an.amt pedido, greatest(0, an.amt - an.saldo) faltou
  ) select coalesce(sum(pedido), 0), coalesce(sum(faltou), 0) into _estornadas, _faltou from aplicado;
  return jsonb_build_object('success', true, 'sale_id', _sale_id, 'motivo', _motivo,
    'canceladas', round(_canceladas, 2), 'estornadas', round(_estornadas, 2), 'nao_recuperado', round(_faltou, 2));
end;
$$;
revoke all on function public.estornar_comissoes_do_deposito(text, text) from public, anon, authenticated;
grant execute on function public.estornar_comissoes_do_deposito(text, text) to service_role;

create or replace function public.bloquear_saldo_contestado(
  _sale_id text, _motivo text default null, _origem text default 'conciliacao'
) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  _s record; _antes numeric; _bloqueado numeric; _faltou numeric; _ultimo text; _comissoes jsonb;
begin
  select id, buyer_id, kind, status, coalesce(total_amount, sale_price, 0)::numeric as valor
    into _s from public.catalog_sales where id = _sale_id;
  if not found then return jsonb_build_object('success', false, 'error', 'venda_nao_encontrada'); end if;
  if _s.kind not in ('wallet_deposit') then
    return jsonb_build_object('success', false, 'error', 'nao_e_deposito_na_carteira', 'kind', _s.kind);
  end if;
  -- 🧾 DIR-198: dinheiro que saiu não paga comissão de indicação. Sempre, mesmo se o bloqueio já existia.
  _comissoes := public.estornar_comissoes_do_deposito(_sale_id, coalesce(_motivo, 'Depósito contestado no gateway'));
  select tipo into _ultimo from public.wallet_ledger
   where sale_id = _sale_id and tipo in ('bloqueio_contestacao', 'liberacao_contestacao')
   order by created_at desc limit 1;
  if _ultimo = 'bloqueio_contestacao' then
    return jsonb_build_object('success', true, 'ja_bloqueado', true, 'bloqueado', 0, 'comissoes', _comissoes);
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
    'saldo_antes', round(_antes, 2), 'saldo_depois', round(_antes - _bloqueado, 2), 'comissoes', _comissoes);
exception when unique_violation then
  return jsonb_build_object('success', false, 'error', 'ja_houve_bloqueio_antes', 'sale_id', _sale_id);
end;
$$;

alter table public.catalog_sales
  add column if not exists conciliacao_resolvida_em timestamptz,
  add column if not exists conciliacao_resolvida_por text,
  add column if not exists conciliacao_motivo text;

create table if not exists public.gateway_acoes (
  id uuid primary key default gen_random_uuid(),
  criada_em timestamptz not null default now(),
  sale_id text not null,
  payment_id text,
  acao text not null,            -- devolver | resolver
  valor numeric(12,2),
  motivo text,
  pedida_por text,
  status text not null default 'pendente',   -- pendente | feita | falhou
  tentativas int not null default 0,
  resultado jsonb,
  executada_em timestamptz
);
create index if not exists gateway_acoes_status_idx on public.gateway_acoes (status, criada_em);
revoke all on table public.gateway_acoes from public, anon, authenticated;
grant all on table public.gateway_acoes to service_role;
comment on table public.gateway_acoes is 'DIR-198: fila de acoes sobre pendencias da conciliacao (devolver pelo gateway, marcar resolvida), registrada antes de acontecer e executada pelo servidor. Só service_role.';

create or replace function public.painel_conciliacao()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  _pagos text[] := array['paid','pago','entregue','shipped','delivered','preparando','saiu_entrega','confirmado','concluido'];
  _cancel text[] := array['cancelado','canceled','cancelled'];
  _gateway text[] := array['pix_mp','credit_card_mp','pix','card_stripe','credit_card'];
  totais jsonb; divergencias jsonb; pendencias jsonb; eventos jsonb; conferencia jsonb; acoes jsonb;
begin
  with g as (
    select s.*, coalesce(total_amount, sale_price, 0)::numeric as v,
      coalesce(gateway->>'situacao', 'nao_conferido') as sit,
      exists (select 1 from public.wallet_ledger w where w.sale_id = s.id and w.tipo in ('estorno_venda', 'estorno_frete')) as devolvido_na_carteira,
      case
        when gateway is null then 'nao_conferido'
        when conciliacao_resolvida_em is not null then 'resolvida'
        when status = any(_pagos) and gateway->>'situacao' in ('retido','devolvido','devolvido_parcial','chargeback','disputa','alterado') then 'dinheiro_saiu'
        when status = any(_cancel) and gateway->>'situacao' = 'liberado' and exists (select 1 from public.wallet_ledger w where w.sale_id = s.id and w.tipo in ('estorno_venda', 'estorno_frete')) then 'ok'
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
        'nome', buyer_name, 'buyer_id', buyer_id, 'devolvido_na_carteira', devolvido_na_carteira,
        'telefone', (select phone from public.app_users u where u.id = g.buyer_id),
        'email', coalesce(buyer_email, (select email from public.app_users u where u.id = g.buyer_id)),
        'saldo_disponivel', (select round(coalesce(saldo_disponivel, 0), 2) from public.app_users u where u.id = g.buyer_id),
        'bloqueado', (select round(coalesce(-sum(valor), 0), 2) from public.wallet_ledger w where w.sale_id = g.id and w.tipo in ('bloqueio_contestacao', 'liberacao_contestacao')),
        'acao_pendente', (select jsonb_build_object('acao', a.acao, 'status', a.status, 'criada_em', a.criada_em) from public.gateway_acoes a where a.sale_id = g.id and a.status = 'pendente' order by a.criada_em desc limit 1)
      ) order by case div when 'dinheiro_saiu' then 0 when 'pago_sem_pagamento' then 1 else 2 end, coalesce((gateway->>'conferido_em')::timestamptz, created_at) desc), '[]'::jsonb)
      from g where div not in ('ok', 'nao_conferido', 'resolvida'))
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
  select jsonb_build_object(
    'pendentes', count(*) filter (where status = 'pendente'),
    'ultimas', (select coalesce(jsonb_agg(jsonb_build_object('acao', acao, 'sale_id', sale_id, 'valor', valor, 'status', status, 'motivo', motivo, 'pedida_por', pedida_por, 'criada_em', criada_em, 'executada_em', executada_em, 'resultado', resultado - 'bruto') order by criada_em desc), '[]'::jsonb) from (select * from public.gateway_acoes order by criada_em desc limit 10) a))
  into acoes from public.gateway_acoes;
  return jsonb_build_object('gerado_em', now(), 'por_situacao', coalesce(totais, '{}'::jsonb), 'divergencias', coalesce(divergencias, '{}'::jsonb), 'pendencias', pendencias, 'eventos', eventos, 'conferencia', conferencia, 'acoes', acoes);
end;
$$;
