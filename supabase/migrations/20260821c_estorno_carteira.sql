-- ══════════════════════════════════════════════════════════════════════════
-- 💳 PONTO 107 (21/08/2026) — DEVOLVER O DINHEIRO AO COMPRADOR
--
-- Pedido do dono, a partir de um caso real: o cliente Ronilson pagou R$ 73,87
-- numa loja, o produto não existia (erro de estoque na loja), a logística
-- cancelou, e o dinheiro ficou parado na conta da empresa. O cliente vai
-- escolher outro produto — mas não existia NENHUM caminho no sistema para
-- devolver esse valor a ele.
--
-- O cancelar_venda() (PONTO 99/106) já desfaz a COMISSÃO. O que faltava era o
-- outro lado: o dinheiro do COMPRADOR. Esta migração fecha isso.
--
-- REGRA (definida pelo dono):
--   • a devolução vira SALDO NA CARTEIRA, já liberado pra usar na loja;
--   • aparece no extrato dele com a explicação do que foi;
--   • só devolve o que ele DE FATO pagou — pedido não pago não devolve nada.
--
-- POR QUE UMA TABELA NOVA, E NÃO UMA LINHA EM catalog_sales:
-- seria tentador gravar o estorno como uma "venda" de kind='estorno' (é o que
-- o wallet_deposit faz). Mas foi exatamente esse tipo de atalho que criou o bug
-- do PONTO 104: a linha de ESCROW morava em commission_ledger e o backfill a
-- confundiu com comissão, repagando 30%. Estorno não é venda. Tabela própria.
--
-- Para onde o dinheiro vai: app_users.saldo_disponivel. É de lá que sai o
-- `saldo_livre_loja` — o único valor que a Loja Virtual aceita gastar
-- (api/functions/getMyWallet.js:60). Colocar em commission_balance seria errado:
-- aquilo é comissão da rede, sacável em PIX, e não é disso que se trata.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.wallet_ledger (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,
  sale_id      text,
  tipo         text not null,     -- estorno_venda | ajuste_manual
  valor        numeric(12,2) not null,
  saldo_antes  numeric(12,2),
  saldo_depois numeric(12,2),
  motivo       text,              -- texto que o cliente lê no extrato
  origem       text,              -- que função gravou (rastro de código)
  created_at   timestamptz not null default now()
);

create index if not exists wallet_ledger_user_idx on public.wallet_ledger (user_id, created_at desc);
-- 🔒 idempotência: um estorno por venda. Rodar duas vezes não devolve em dobro.
create unique index if not exists wallet_ledger_estorno_uq
  on public.wallet_ledger (sale_id) where tipo = 'estorno_venda';

comment on table public.wallet_ledger is
  'PONTO 107 (21/08/2026): extrato append-only de movimentacao de saldo_disponivel que NAO e lance nem deposito. Hoje: devolucao de venda cancelada.';

-- ─────────────────────────────────────────────────────────────────────────
-- Devolve ao comprador o que ele pagou, como saldo livre na carteira.
-- Idempotente pelo índice único acima: a segunda chamada devolve devolvido=0.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.estornar_para_carteira(_sale_id text, _motivo text default null)
returns jsonb language plpgsql security definer as $$
declare
  _venda   record;
  _antes   numeric := 0;
  _depois  numeric := 0;
  _texto   text;
begin
  select id, buyer_id, buyer_name, total_amount, status, product_title
    into _venda
    from public.catalog_sales where id = _sale_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Venda nao encontrada');
  end if;
  if _venda.buyer_id is null then
    return jsonb_build_object('success', false, 'error', 'Venda sem comprador identificado');
  end if;
  if coalesce(_venda.total_amount, 0) <= 0 then
    return jsonb_build_object('success', true, 'devolvido', 0, 'motivo_pulo', 'valor zero');
  end if;

  -- já devolvido? (índice único garante, mas responder limpo é melhor que erro)
  if exists (select 1 from public.wallet_ledger
              where sale_id = _sale_id and tipo = 'estorno_venda') then
    return jsonb_build_object('success', true, 'devolvido', 0, 'motivo_pulo', 'ja estornado');
  end if;

  _texto := coalesce(
    _motivo,
    'Devolucao da compra' || coalesce(' de ' || _venda.product_title, '') || ' - pedido cancelado'
  );

  -- credita e captura o antes/depois na MESMA escrita
  update public.app_users u
     set saldo_disponivel = round(coalesce(u.saldo_disponivel, 0) + _venda.total_amount, 2)
   where u.id = _venda.buyer_id
  returning round(coalesce(u.saldo_disponivel, 0) - _venda.total_amount, 2), u.saldo_disponivel
    into _antes, _depois;

  if _antes is null then
    return jsonb_build_object('success', false, 'error', 'Comprador nao encontrado');
  end if;

  insert into public.wallet_ledger
    (user_id, sale_id, tipo, valor, saldo_antes, saldo_depois, motivo, origem)
  values
    (_venda.buyer_id, _sale_id, 'estorno_venda', round(_venda.total_amount, 2),
     _antes, _depois, _texto, 'sql/estornar_para_carteira');

  return jsonb_build_object(
    'success',       true,
    'devolvido',     round(_venda.total_amount, 2),
    'comprador',     _venda.buyer_name,
    'saldo_antes',   _antes,
    'saldo_depois',  _depois,
    'motivo',        _texto
  );
end;
$$;

revoke all on function public.estornar_para_carteira(text, text) from public, anon, authenticated;
grant execute on function public.estornar_para_carteira(text, text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- 🔴 A DEVOLUÇÃO NÃO PODE SER AUTOMÁTICA EM TODO CANCELAMENTO.
--
-- Existem dois cancelamentos que parecem iguais e são opostos no dinheiro:
--
--   CANCELAMENTO ADMINISTRATIVO (o caso do Ronilson): o cliente pagou, a
--   empresa ficou com o dinheiro, o produto não existia. Aqui a devolução é
--   OBRIGATÓRIA — senão a empresa fica com dinheiro que não é dela.
--
--   CHARGEBACK / REFUND no Mercado Pago: o dinheiro JÁ voltou pro cliente pelo
--   cartão. Creditar a carteira aqui faria a empresa pagar DUAS VEZES —
--   perderia a venda e ainda daria saldo de presente.
--
-- Por isso `_devolver_ao_comprador` nasce FALSE. Só devolve quem pedir
-- explicitamente. O padrão seguro é não mexer no dinheiro do cliente.
--   • api/functions/updateOrderStatus.js (cancelamento pelo admin) → true
--   • api/functions/mpWebhook.js         (chargeback/refund)       → false
-- ─────────────────────────────────────────────────────────────────────────
drop function if exists public.cancelar_venda(text, text);

create or replace function public.cancelar_venda(
  _sale_id text,
  _motivo text default null,
  _devolver_ao_comprador boolean default false
)
returns jsonb language plpgsql security definer as $$
declare
  _total             numeric := 0;
  _status_antes      text;
  _escrow_preso      numeric := 0;
  _escrow_estornado  numeric := 0;
  _escrow_faltou     numeric := 0;
  _comissao          numeric := 0;
  _comissao_faltou   numeric := 0;
  _tem_escrow        boolean := public._tem_escrow_ledger();
  _devolucao         jsonb   := jsonb_build_object('devolvido', 0);
  _era_pago          boolean := false;
begin
  select coalesce(total_amount, 0), status into _total, _status_antes
    from public.catalog_sales where id = _sale_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Venda nao encontrada');
  end if;

  -- Mesma lista de JA_PAGO do api/functions/updateOrderStatus.js
  _era_pago := lower(coalesce(_status_antes, '')) in
    ('paid','entregue','enviado','confirmado','pago','concluido','preparando','saiu_entrega');

  if _tem_escrow then
    execute $q$
      with presos as (
        update public.commission_ledger l set status = 'cancelado', released_at = now()
          where l.sale_id = $1 and l.status = 'a_liberar'
          returning l.amount
      ) select coalesce(sum(amount), 0) from presos
    $q$ into _escrow_preso using _sale_id;

    execute $q$
      with liberados as (
        update public.commission_ledger l set status = 'estornado', released_at = now()
          where l.sale_id = $1 and l.status = 'disponivel' and l.role_in_sale = 'venda'
          returning l.beneficiary_id, l.amount
      ), agg as (
        select beneficiary_id, sum(amount) as amt from liberados group by beneficiary_id
      ), antes as (
        select a.beneficiary_id, a.amt, coalesce(u.commission_balance, 0) as saldo
          from agg a join public.app_users u on u.id = a.beneficiary_id
      ), aplicado as (
        update public.app_users u
           set commission_balance = round(greatest(0, an.saldo - an.amt), 2)
          from antes an where u.id = an.beneficiary_id
          returning an.amt as pedido, greatest(0, an.amt - an.saldo) as faltou
      )
      select coalesce(sum(pedido), 0), coalesce(sum(faltou), 0) from aplicado
    $q$ into _escrow_estornado, _escrow_faltou using _sale_id;
  end if;

  with revertidas as (
    update public.commission_records r set status = 'reversed'
      where r.sale_id = _sale_id and coalesce(r.status, '') = 'confirmed'
      returning r.user_id, r.amount
  ), agg as (
    select user_id, sum(amount) as amt from revertidas group by user_id
  ), antes as (
    select a.user_id, a.amt, coalesce(u.commission_balance, 0) as saldo
      from agg a join public.app_users u on u.id = a.user_id
  ), aplicado as (
    update public.app_users u
       set commission_balance = round(greatest(0, an.saldo - an.amt), 2)
      from antes an where u.id = an.user_id
      returning an.amt as pedido, greatest(0, an.amt - an.saldo) as faltou
  )
  select coalesce(sum(pedido), 0), coalesce(sum(faltou), 0)
    into _comissao, _comissao_faltou from aplicado;

  -- 💳 devolução ao comprador — só quando pedida E só se ele tiver pago mesmo.
  -- Pedido que nunca foi pago não devolve nada: não entrou dinheiro nenhum.
  if _devolver_ao_comprador and _era_pago then
    _devolucao := public.estornar_para_carteira(_sale_id, _motivo);
  end if;

  update public.catalog_sales set status = 'cancelado', commission_total = 0 where id = _sale_id;

  return jsonb_build_object(
    'success',            true,
    'sale_id',            _sale_id,
    'motivo',             _motivo,
    'status_antes',       _status_antes,
    'era_pago',           _era_pago,
    'escrow_instalado',   _tem_escrow,
    'escrow_preso',       round(_escrow_preso, 2),
    'escrow_estornado',   round(_escrow_estornado, 2),
    'comissao_estornada', round(_comissao, 2),
    'nao_recuperado',     round(_escrow_faltou + _comissao_faltou, 2),
    'comprador_pagou',    round(_total, 2),
    'devolucao',          _devolucao
  );
end;
$$;

revoke all on function public.cancelar_venda(text, text, boolean) from public, anon, authenticated;
grant execute on function public.cancelar_venda(text, text, boolean) to service_role;
