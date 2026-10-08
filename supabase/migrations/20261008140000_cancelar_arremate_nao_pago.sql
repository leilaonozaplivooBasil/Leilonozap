-- 🏷️ DIR-208 (08/10/2026) — CANCELAR UM ARREMATE QUE NUNCA FOI PAGO
--
-- O vigia (DIR-205) avisa "arremate parado por falta de saldo há mais de 48h —
-- decidir: cobrar ou cancelar". Esta é a metade "cancelar", como UMA função
-- atômica, para o admin não precisar mexer em quatro tabelas na mão (foi assim
-- que a cadeira de R$ 246 da conta do dono ficou 26 dias parada: ninguém
-- tinha como cancelar sem deixar comissão e reserva penduradas).
--
-- O que faz, tudo ou nada:
--   1. exige que o leilão esteja em awaiting_payment com vencedor (senão recusa);
--   2. estorna as comissões do martelo ainda 'confirmed' (commission_records →
--      'reversed') e desconta do commission_balance de quem recebeu — nunca
--      deixa saldo negativo (o que faltar é informado, padrão cancelar_venda);
--   3. devolve a reserva do vencedor (saldo_reservado → saldo_disponivel), no
--      máximo o valor preso (lance + frete reservado) e no máximo o que há
--      reservado, com a MESMA trava anti-devolução-dupla do entityWrite: uma
--      linha em reserva_ledger por (leilão, pessoa);
--   4. marca o leilão: order_status 'cancelado', vencedor limpo, status
--      continua 'ended' (dá para reativar ou duplicar pelo editor), e o rastro
--      fica em raw_base44.arremate_cancelado;
--   5. grava system_logs (component cancelar_arremate_nao_pago).
-- Plano de carreira/investimento e leilão de teste ficam de fora de propósito.
create or replace function public.cancelar_arremate_nao_pago(_auction_id text, _motivo text default null, _por text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  _a record; _u record;
  _valor numeric; _liberar numeric := 0; _comissao numeric := 0; _comissao_faltou numeric := 0; _n_com int := 0;
  _ja_devolvido boolean := false; _rastro jsonb;
begin
  select * into _a from public.auctions where id = _auction_id for update;
  if not found then return jsonb_build_object('success', false, 'error', 'leilao_nao_encontrado'); end if;
  if coalesce(_a.order_status, '') <> 'awaiting_payment' then return jsonb_build_object('success', false, 'error', 'nao_esta_aguardando_pagamento', 'order_status', _a.order_status); end if;
  if _a.winner_id is null then return jsonb_build_object('success', false, 'error', 'sem_vencedor'); end if;
  if coalesce(_a.is_investment_plan, false) or coalesce(_a.is_test_auction, false) or _a.title ~* '\mplano\M' then
    return jsonb_build_object('success', false, 'error', 'plano_ou_teste_nao_cancela_aqui');
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
  _valor := round(coalesce(_a.current_price, 0) + coalesce(_a.frete_reservado_valor, 0), 2);
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
