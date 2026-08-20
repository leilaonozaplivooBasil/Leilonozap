-- ══════════════════════════════════════════════════════════════════════════
-- 🔴 PONTO 99 (21/08/2026) — CANCELAR UMA VENDA NÃO ESTORNAVA NADA
--
-- A auditoria geral de ponta a ponta encontrou isto, e são DOIS vazamentos
-- que se somam na mesma venda:
--
-- 1) COMISSÃO PAGA E NÃO DEVOLVIDA
--    Quando a venda é paga, storeFulfill.js grava as linhas em
--    commission_records e credita commission_balance de cada beneficiário na
--    hora — dinheiro sacável. Cancelar a venda depois só trocava
--    catalog_sales.status para 'cancelado' (updateOrderStatus.js:37, um PATCH
--    de UMA coluna). As comissões continuavam 'confirmed' e o saldo sacável
--    continuava lá. A plataforma pagava 30% de uma venda que não existe.
--
-- 2) ESCROW LIBERANDO 100% DE VENDA CANCELADA
--    liberar_saldos_maturados() (migração 20260716_saldo_a_liberar.sql) só
--    olhava `status='a_liberar' AND release_at <= now()`. Nunca olhava o
--    estado da venda. Passados os 7 dias (ou 14 no cartão), o vendedor
--    recebia o VALOR TOTAL de uma venda cancelada, e virava saldo sacável.
--    Mesmo furo em confirmar_recebimento().
--
-- O que esta migração faz:
--   • as duas funções de liberação passam a ignorar venda cancelada;
--   • nasce cancelar_venda(), que desfaz o dinheiro de verdade — prende o
--     escrow, estorna as comissões já creditadas e marca tudo no extrato.
--
-- ⚠️ O QUE ESTA MIGRAÇÃO NÃO FAZ (de propósito, precisa de decisão do dono):
--   devolver ao COMPRADOR o dinheiro que ele pagou. Estornar PIX no Mercado
--   Pago ou creditar como saldo na carteira é regra de negócio, não conserto
--   de bug. cancelar_venda() devolve `comprador_pagou` no resultado justamente
--   pra esse valor ficar visível e não passar em branco.
-- ══════════════════════════════════════════════════════════════════════════

-- Os três grafias de cancelamento que existem no código hoje:
-- 'cancelado' (updateOrderStatus.js:5), 'canceled' (excluirMeuPedido.js:17)
-- e 'cancelled'. A função aceita as três — errar a grafia não pode virar
-- brecha pra soltar dinheiro.
create or replace function public._venda_cancelada(_status text)
returns boolean language sql immutable as $$
  select lower(coalesce(_status,'')) in ('cancelado','canceled','cancelled','estornado','refunded','devolvido');
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 1) LIBERAÇÃO POR PRAZO — agora confere a venda antes de soltar o dinheiro
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.liberar_saldos_maturados()
returns int language plpgsql security definer as $$
declare _n int;
begin
  with matured as (
    update public.commission_ledger l set status='disponivel', released_at=now()
      where l.status='a_liberar' and l.release_at is not null and l.release_at <= now()
        -- 🔒 PONTO 99: venda cancelada NUNCA matura. A linha fica 'a_liberar'
        -- até cancelar_venda() marcá-la como 'cancelado' — não some do extrato.
        and exists (
          select 1 from public.catalog_sales s
           where s.id = l.sale_id and not public._venda_cancelada(s.status)
        )
      returning l.beneficiary_id, l.amount
  ), agg as (select beneficiary_id, sum(amount) amt from matured group by beneficiary_id)
  update public.app_users u
     set commission_balance = round(coalesce(u.commission_balance,0) + a.amt, 2)
    from agg a where u.id = a.beneficiary_id;
  get diagnostics _n = row_count; return _n;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2) LIBERAÇÃO ANTECIPADA (comprador confirmou o recebimento) — mesmo guard
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.confirmar_recebimento(_sale_id text)
returns int language plpgsql security definer as $$
declare _n int;
begin
  -- 🔒 PONTO 99: não dá pra "confirmar o recebimento" de uma venda cancelada.
  if exists (select 1 from public.catalog_sales s
              where s.id=_sale_id and public._venda_cancelada(s.status)) then
    return 0;
  end if;

  with rel as (
    update public.commission_ledger l set status='disponivel', released_at=now()
      where l.sale_id=_sale_id and l.status='a_liberar' and l.role_in_sale='venda'
      returning l.beneficiary_id, l.amount
  ), agg as (select beneficiary_id, sum(amount) amt from rel group by beneficiary_id)
  update public.app_users u
     set commission_balance = round(coalesce(u.commission_balance,0) + a.amt, 2)
    from agg a where u.id = a.beneficiary_id;
  get diagnostics _n = row_count;
  update public.catalog_sales set status='entregue' where id=_sale_id and status <> 'entregue';
  return _n;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3) CANCELAR DE VERDADE — desfaz o dinheiro, não só a coluna de status
--
-- Roda tudo numa transação só (é uma função). Idempotente: rodar duas vezes
-- não estorna duas vezes, porque só toca linha que ainda está no estado ativo
-- ('a_liberar'/'disponivel' no extrato, 'confirmed' em commission_records).
--
-- Sobre o clamp em zero: se a pessoa já sacou a comissão, o saldo dela não
-- cobre o estorno. Deixar commission_balance NEGATIVO travaria saque dela pra
-- sempre, em silêncio, sem ninguém entender por quê. Então o saldo para em
-- zero e o que não deu pra recuperar volta no resultado, em
-- `nao_recuperado` — dívida visível, pro admin cobrar. Prejuízo escondido é
-- pior que prejuízo conhecido.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.cancelar_venda(_sale_id text, _motivo text default null)
returns jsonb language plpgsql security definer as $$
declare
  _total             numeric := 0;
  _escrow_preso      numeric := 0;
  _escrow_estornado  numeric := 0;
  _escrow_faltou     numeric := 0;
  _comissao          numeric := 0;
  _comissao_faltou   numeric := 0;
begin
  select coalesce(total_amount,0) into _total from public.catalog_sales where id = _sale_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Venda nao encontrada');
  end if;

  -- ─── 3.1 ESCROW AINDA PRESO: nunca vai maturar ───────────────────────────
  -- A linha continua no extrato (status 'cancelado'), não é apagada: o
  -- vendedor precisa VER que o dinheiro existiu e por que não veio.
  with presos as (
    update public.commission_ledger l set status='cancelado', released_at=now()
      where l.sale_id=_sale_id and l.status='a_liberar'
      returning l.amount
  ) select coalesce(sum(amount),0) into _escrow_preso from presos;

  -- ─── 3.2 ESCROW JÁ LIBERADO: puxa de volta do saldo sacável ──────────────
  -- (cancelamento depois dos 7/14 dias, ou depois de confirmar_recebimento)
  --
  -- ⚠️ O saldo ANTES do UPDATE é lido na CTE `antes`. Não dá pra usar
  -- RETURNING pra isso: dentro de um UPDATE ... RETURNING, `u.coluna` já é o
  -- valor NOVO. Como todas as CTEs de um mesmo comando enxergam o mesmo
  -- snapshot, `antes` lê o valor velho — que é o que o cálculo do que faltou
  -- precisa.
  with liberados as (
    update public.commission_ledger l set status='estornado', released_at=now()
      where l.sale_id=_sale_id and l.status='disponivel' and l.role_in_sale='venda'
      returning l.beneficiary_id, l.amount
  ), agg as (
    select beneficiary_id, sum(amount) as amt from liberados group by beneficiary_id
  ), antes as (
    select a.beneficiary_id, a.amt, coalesce(u.commission_balance,0) as saldo
      from agg a join public.app_users u on u.id = a.beneficiary_id
  ), aplicado as (
    update public.app_users u
       set commission_balance = round(greatest(0, an.saldo - an.amt), 2)
      from antes an where u.id = an.beneficiary_id
      returning an.amt as pedido, greatest(0, an.amt - an.saldo) as faltou
  )
  select coalesce(sum(pedido),0), coalesce(sum(faltou),0)
    into _escrow_estornado, _escrow_faltou from aplicado;

  -- ─── 3.3 COMISSÕES (os 30% da árvore oficial, storeFulfill.js) ───────────
  with revertidas as (
    update public.commission_records r set status='reversed'
      where r.sale_id=_sale_id and coalesce(r.status,'') = 'confirmed'
      returning r.user_id, r.amount
  ), agg as (
    select user_id, sum(amount) as amt from revertidas group by user_id
  ), antes as (
    select a.user_id, a.amt, coalesce(u.commission_balance,0) as saldo
      from agg a join public.app_users u on u.id = a.user_id
  ), aplicado as (
    update public.app_users u
       set commission_balance = round(greatest(0, an.saldo - an.amt), 2)
      from antes an where u.id = an.user_id
      returning an.amt as pedido, greatest(0, an.amt - an.saldo) as faltou
  )
  select coalesce(sum(pedido),0), coalesce(sum(faltou),0)
    into _comissao, _comissao_faltou from aplicado;

  -- ─── 3.4 marca a venda ───────────────────────────────────────────────────
  update public.catalog_sales set status='cancelado', commission_total=0 where id=_sale_id;

  return jsonb_build_object(
    'success',            true,
    'sale_id',            _sale_id,
    'motivo',             _motivo,
    'escrow_preso',       round(_escrow_preso, 2),
    'escrow_estornado',   round(_escrow_estornado, 2),
    'comissao_estornada', round(_comissao, 2),
    -- 💸 o que a pessoa já tinha sacado e o saldo dela não cobriu. Dívida
    -- VISÍVEL de propósito: deixar commission_balance negativo travaria o
    -- saque dela pra sempre, em silêncio, sem ninguém entender por quê.
    'nao_recuperado',     round(_escrow_faltou + _comissao_faltou, 2),
    -- ⚠️ o que o COMPRADOR pagou e ainda NÃO foi devolvido a ele.
    -- Devolução ao comprador é decisão de negócio — ver o cabeçalho.
    'comprador_pagou',    round(_total, 2)
  );
end;
$$;

revoke all on function public.cancelar_venda(text, text) from public, anon, authenticated;
grant execute on function public.cancelar_venda(text, text) to service_role;

comment on function public.cancelar_venda(text, text) is
  'PONTO 99 (21/08/2026): cancelamento que desfaz o dinheiro - prende o escrow, estorna comissao ja creditada e reporta o que nao foi recuperado. Devolucao ao comprador NAO esta aqui.';
