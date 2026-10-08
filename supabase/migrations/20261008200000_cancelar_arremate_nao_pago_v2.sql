-- 🏷️ DIR-210 (08/10/2026) — cancelar_arremate_nao_pago v2: a corrida "depositou no mesmo minuto"
--
-- A v1 (20261008140000) é a função que o admin usou na cadeira. Na DIR-210 ela passa a
-- ser chamada pelo cron de liquidação quando o arremate completa 48h sem saldo. O cron
-- decide por "saldo insuficiente" segundos antes de chamar aqui; se o depósito caiu nesse
-- meio-tempo (ou um lance coberto em outro leilão devolveu reserva), a v1 cancelaria
-- mesmo assim, porque só olha order_status. A v2 confere o saldo do vencedor antes de
-- qualquer efeito: se já dá para pagar, recusa com 'tem_saldo_agora' e o próximo tick
-- liquida. O resto é idêntico à v1 (mesma matemática, mesmas travas, mesmo rastro).
create or replace function public.cancelar_arremate_nao_pago(_auction_id text, _motivo text default null, _por text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  _a record; _u record;
  _valor numeric; _liberar numeric := 0; _comissao numeric := 0; _comissao_faltou numeric := 0; _n_com int := 0;
  _ja_devolvido boolean := false; _rastro jsonb; _saldo_agora numeric;
begin
  select * into _a from public.auctions where id = _auction_id for update;
  if not found then return jsonb_build_object('success', false, 'error', 'leilao_nao_encontrado'); end if;
  if coalesce(_a.order_status, '') <> 'awaiting_payment' then return jsonb_build_object('success', false, 'error', 'nao_esta_aguardando_pagamento', 'order_status', _a.order_status); end if;
  if _a.winner_id is null then return jsonb_build_object('success', false, 'error', 'sem_vencedor'); end if;
  if coalesce(_a.is_investment_plan, false) or coalesce(_a.is_test_auction, false) or _a.title ~* '\mplano\M' then
    return jsonb_build_object('success', false, 'error', 'plano_ou_teste_nao_cancela_aqui');
  end if;

  -- v2: o vencedor já tem com que pagar? Então não é caso de cancelar — é de liquidar.
  _valor := round(coalesce(_a.current_price, 0) + coalesce(_a.frete_reservado_valor, 0), 2);
  select round(coalesce(saldo_disponivel, 0) + coalesce(saldo_reservado, 0), 2) into _saldo_agora
    from public.app_users where id = _a.winner_id;
  if found and _valor > 0 and _saldo_agora >= _valor then
    return jsonb_build_object('success', false, 'error', 'tem_saldo_agora', 'saldo', _saldo_agora, 'valor', _valor);
  end if;

  -- 2) comissões do martelo
  with revertidas as (
    update public.commission_records r set status = 'reversed'
      where r.sale_id = _auction_id and coalesce(r.status, '') = 'confirmed'
      returning r.user_id, r.amount
  ), agg as (
    select user_id, sum(amount) as amt, count(*) as n from revertidas group by user_id
  ), antes as (
    select a.user_id, a.amt, a.n, coalesce(u.commission_balance, 0) as saldo
      from agg a join public.app_users u on u.id = a.user_id
  ), aplicado as (
    update public.app_users u
       set commission_balance = round(greatest(0, an.saldo - an.amt), 2)
      from antes an where u.id = an.user_id
      returning an.amt as pedido, greatest(0, an.amt - an.saldo) as faltou, an.n as n
  )
  select coalesce(sum(pedido), 0), coalesce(sum(faltou), 0), coalesce(sum(n), 0)
    into _comissao, _comissao_faltou, _n_com from aplicado;

  -- 3) reserva do vencedor (trava anti-devolução-dupla por leilão + pessoa)
  select exists (
    select 1 from public.reserva_ledger l
     where l.auction_id = _auction_id and l.user_id = _a.winner_id
       and l.tipo in ('devolucao_leilao_cancelado', 'devolucao_leilao_excluido', 'devolucao_arremate_cancelado')
  ) into _ja_devolvido;
  if not _ja_devolvido and _valor > 0 then
    select * into _u from public.app_users where id = _a.winner_id for update;
    if found then
      _liberar := round(least(_valor, coalesce(_u.saldo_reservado, 0)), 2);
      if _liberar > 0 then
        update public.app_users
           set saldo_disponivel = round(coalesce(saldo_disponivel, 0) + _liberar, 2),
               saldo_reservado = round(coalesce(saldo_reservado, 0) - _liberar, 2)
         where id = _a.winner_id;
        insert into public.reserva_ledger (user_id, auction_id, tipo, direcao, valor, saldo_antes, saldo_depois, origem, observacao)
        values (_a.winner_id, _auction_id, 'devolucao_arremate_cancelado', 'saida_reserva', _liberar,
                round(coalesce(_u.saldo_reservado, 0), 2), round(coalesce(_u.saldo_reservado, 0) - _liberar, 2),
                'cancelar_arremate_nao_pago', coalesce(_motivo, 'Arremate não pago cancelado pelo admin'));
      end if;
    end if;
  end if;

  -- 4) o leilão
  _rastro := jsonb_build_object(
    'em', now(), 'por', _por, 'motivo', _motivo,
    'vencedor_id', _a.winner_id, 'vencedor_nome', _a.winner_name, 'valor', _valor,
    'comissoes_estornadas', _comissao, 'comissoes_nao_recuperadas', _comissao_faltou, 'linhas', _n_com,
    'reserva_devolvida', _liberar, 'reserva_ja_devolvida', _ja_devolvido);
  update public.auctions
     set order_status = 'cancelado', winner_id = null, winner_name = null,
         raw_base44 = coalesce(raw_base44, '{}'::jsonb) || jsonb_build_object('arremate_cancelado', _rastro),
         updated_at = now()
   where id = _auction_id;

  -- 5) rastro
  insert into public.system_logs (component_name, step, status, message, payload, created_at)
  values ('cancelar_arremate_nao_pago', 'CANCELADO', 'info',
          'Arremate ' || _auction_id || ' (' || coalesce(_a.title, '') || ') cancelado: comissões R$ ' || _comissao || ' estornadas, reserva R$ ' || _liberar || ' devolvida.',
          _rastro || jsonb_build_object('auction_id', _auction_id), now());

  return jsonb_build_object('success', true, 'auction_id', _auction_id) || _rastro;
end;
$$;
revoke execute on function public.cancelar_arremate_nao_pago(text, text, text) from public, anon, authenticated;
comment on function public.cancelar_arremate_nao_pago(text, text, text) is
  'DIR-208/210: cancela arremate em awaiting_payment (comissões do martelo → reversed, reserva devolvida, order_status cancelado). v2 recusa com tem_saldo_agora se o vencedor já pode pagar. Só service_role.';
