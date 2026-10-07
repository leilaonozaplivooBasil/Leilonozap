-- 🏷️ DIR-205 (07/10/2026) — ARREMATE SEM SALDO NÃO É SILÊNCIO
--
-- Medido em produção: um arremate de R$ 246 (encerrado em 11/09) ficou 26 dias
-- em awaiting_payment. O cron liquidarArrematesPendentes tentou a cada 10 min
-- ("0 liquidado(s), 1 sem saldo") e ninguém — nem o vencedor, nem o admin —
-- foi avisado. Esta é a v2 do vigia_financeiro() (DIR-204): a única mudança é
-- a regra 11 (arremate sem saldo há mais de 1h; vermelho a partir de 48h) e o
-- número 'arremates_sem_saldo'. Continua SÓ LEITURA.
-- O e-mail ao vencedor (1h e 24h) mora em api/functions/liquidarArrematesPendentes.js.

create or replace function public.vigia_financeiro()
returns jsonb language plpgsql security definer stable set search_path to 'public' as $$
declare
  _rel jsonb; _conc jsonb; _alertas jsonb := '[]'::jsonb; _n int; _v numeric; _lista jsonb; _robos jsonb := '[]'::jsonb; _h numeric; _narr int := 0; _harr numeric := 0;
  _pagos text[] := array['paid','pago','entregue','shipped','delivered','preparando','saiu_entrega','confirmado','concluido','enviado'];
  _nao_loja text[] := array['wallet_deposit','arremate','passaporte','commission_deposit','operacao_deposit','seller_freight','reposicao'];
begin
  _rel := public.relatorio_comissoes();
  _conc := public.painel_conciliacao();

  -- 1) saldo × extrato
  _n := jsonb_array_length(coalesce(_rel->'saldos_fora_do_extrato', '[]'::jsonb));
  if _n > 0 then
    _alertas := _alertas || jsonb_build_object('codigo', 'saldo_fora_do_extrato', 'gravidade', 'vermelho',
      'titulo', _n || ' conta(s) com saldo diferente do extrato',
      'detalhe', (select string_agg((x->>'nome') || ': saldo R$ ' || (x->>'saldo') || ' × extrato R$ ' || (x->>'extrato'), '; ') from jsonb_array_elements(_rel->'saldos_fora_do_extrato') x));
  end if;

  -- 2) liberação dos 7 dias atrasada
  _n := coalesce((_rel->>'em_espera_vencidas')::int, 0);
  if _n > 0 then
    _alertas := _alertas || jsonb_build_object('codigo', 'liberacao_atrasada', 'gravidade', 'vermelho',
      'titulo', _n || ' comissão(ões) de indicação venceram os 7 dias e não liberaram', 'detalhe', 'O robô liberar-comissao-indicacao (de hora em hora) não rodou ou falhou.');
  end if;

  -- 3) indicação a conferir (cliente movido depois do depósito)
  _n := jsonb_array_length(coalesce(_rel->'indicacoes_a_conferir', '[]'::jsonb));
  if _n > 0 then
    _alertas := _alertas || jsonb_build_object('codigo', 'indicacao_a_conferir', 'gravidade', 'amarelo',
      'titulo', _n || ' depósito(s) cujo indicador atual não recebeu os 10%',
      'detalhe', (select string_agg((x->>'cliente') || ' → ' || (x->>'indicador') || ' (R$ ' || (x->>'dez_pct') || ')', '; ') from jsonb_array_elements(_rel->'indicacoes_a_conferir') x));
  end if;

  -- 4) venda da loja paga nas últimas 48h sem nenhuma comissão
  select count(*), coalesce(sum(cs.total_amount), 0), coalesce(jsonb_agg(jsonb_build_object('venda', cs.id, 'valor', cs.total_amount, 'comprador', cs.buyer_name)), '[]'::jsonb)
    into _n, _v, _lista
    from public.catalog_sales cs
   where coalesce(cs.kind, 'loja') <> all(_nao_loja)
     and lower(coalesce(cs.status, '')) = any(_pagos)
     and cs.created_at >= now() - interval '48 hours'
     and cs.created_at <= now() - interval '15 minutes'
     and coalesce(cs.total_amount, 0) > 0
     and not exists (select 1 from public.commission_records r where r.sale_id = cs.id);
  if _n > 0 then
    _alertas := _alertas || jsonb_build_object('codigo', 'venda_sem_comissao', 'gravidade', 'vermelho',
      'titulo', _n || ' venda(s) paga(s) sem comissão gerada (R$ ' || round(_v, 2) || ' em vendas)', 'detalhe', _lista::text);
  end if;

  -- 5) leilão encerrado nas últimas 48h, com vencedor, sem comissão (fora teste e plano)
  select count(*), coalesce(jsonb_agg(jsonb_build_object('leilao', a.id, 'titulo', a.title, 'valor', a.current_price)), '[]'::jsonb)
    into _n, _lista
    from public.auctions a
   where a.status = 'ended' and a.winner_id is not null
     and a.end_time between now() - interval '48 hours' and now() - interval '15 minutes'
     and coalesce(a.is_test_auction, false) = false and coalesce(a.is_investment_plan, false) = false
     and a.title not ilike '%plano de investimento%'
     and not exists (select 1 from public.commission_records r where r.sale_id = a.id);
  if _n > 0 then
    _alertas := _alertas || jsonb_build_object('codigo', 'leilao_sem_comissao', 'gravidade', 'vermelho',
      'titulo', _n || ' leilão(ões) encerrado(s) sem comissão do martelo', 'detalhe', _lista::text);
  end if;

  -- 6) crédito que falhou (linha ficou 'pending')
  select count(*), coalesce(sum(amount), 0) into _n, _v from public.commission_records where status = 'pending';
  if _n > 0 then
    _alertas := _alertas || jsonb_build_object('codigo', 'credito_falhou', 'gravidade', 'vermelho',
      'titulo', _n || ' comissão(ões) gerada(s) sem cair no saldo (R$ ' || round(_v, 2) || ')', 'detalhe', 'commission_records com status pending: o crédito atômico falhou e ninguém reprocessou.');
  end if;

  -- 7) cupom Passaporte vivo sobre depósito que não está pago
  select count(*), coalesce(sum(pc.valor_credito - pc.valor_liberado - pc.valor_cancelado + pc.saldo_restante), 0) into _n, _v
    from public.passaporte_coupons pc join public.catalog_sales cs on cs.id = pc.origin_sale_id
   where pc.bonus_creditado_em is null and pc.status <> 'cancelado'
     and (lower(coalesce(cs.status, '')) <> all(_pagos) or coalesce(cs.gateway->>'situacao', '') in ('devolvido', 'devolvido_parcial', 'chargeback'));
  if _n > 0 then
    _alertas := _alertas || jsonb_build_object('codigo', 'cupom_sem_deposito', 'gravidade', 'amarelo',
      'titulo', _n || ' cupom(ns) de bônus vivo(s) sobre depósito não pago ou devolvido', 'detalhe', 'R$ ' || round(_v, 2) || ' de crédito que não deveria existir.');
  end if;

  -- 8) conciliação com o gateway: pendências e ações que não andaram
  _n := jsonb_array_length(coalesce(_conc->'pendencias', '[]'::jsonb));
  if _n > 0 then
    _alertas := _alertas || jsonb_build_object('codigo', 'conciliacao_pendente', 'gravidade', 'amarelo',
      'titulo', _n || ' pendência(s) na conciliação com o gateway', 'detalhe', 'Painel do Investidor → Conciliação. Dinheiro que saiu lá, cancelado aqui ou pago aqui sem pagamento lá.');
  end if;
  _n := coalesce((_conc->'acoes'->>'pendentes')::int, 0);
  if _n > 0 then
    _alertas := _alertas || jsonb_build_object('codigo', 'acao_gateway_pendente', 'gravidade', 'amarelo',
      'titulo', _n || ' ação(ões) no gateway (devolver/resolver) ainda pendente(s)', 'detalhe', 'O cron da conciliação tenta até 3 vezes; se continuar, o gateway está recusando.');
  end if;

  -- 9) webhook do gateway mudo há mais de 24h
  select extract(epoch from (now() - max(recebido_em))) / 3600 into _h from public.gateway_eventos;
  if _h is not null and _h > 24 then
    _alertas := _alertas || jsonb_build_object('codigo', 'webhook_mudo', 'gravidade', 'amarelo',
      'titulo', 'Nenhum aviso do gateway há ' || round(_h) || ' horas', 'detalhe', 'Pode ser dia sem pagamento ou o webhook caiu. A conciliação de 30 em 30 min cobre, mas confira o gateway.');
  end if;

  -- 10) robôs do banco (pg_cron): última rodada falhou ou está atrasada
  begin
    with ult as (
      select j.jobid, j.jobname, j.schedule,
             (select d.status from cron.job_run_details d where d.jobid = j.jobid order by d.start_time desc limit 1) as ultimo_status,
             (select max(d.start_time) from cron.job_run_details d where d.jobid = j.jobid) as ultima_rodada
        from cron.job j where j.active
    )
    select coalesce(jsonb_agg(jsonb_build_object('robo', jobname, 'status', ultimo_status, 'ultima', ultima_rodada)), '[]'::jsonb)
      into _robos
      from ult
     where ultimo_status = 'failed'
        or ultima_rodada is null
        or (schedule like '* * * * *' and ultima_rodada < now() - interval '15 minutes')
        or (schedule like '% * * * *' and schedule not like '* * * * *' and ultima_rodada < now() - interval '2 hours')
        or (schedule not like '% * * * *' and ultima_rodada < now() - interval '26 hours');
  exception when others then
    _robos := jsonb_build_array(jsonb_build_object('robo', 'cron.job_run_details', 'status', 'sem_leitura', 'erro', sqlerrm));
  end;
  if jsonb_array_length(_robos) > 0 and not (_robos->0->>'status' = 'sem_leitura') then
    _alertas := _alertas || jsonb_build_object('codigo', 'robo_parado', 'gravidade', 'vermelho',
      'titulo', jsonb_array_length(_robos) || ' robô(s) do banco parado(s) ou com falha', 'detalhe', _robos::text);
  end if;

  -- 11) arremate com vencedor e SEM SALDO há mais de 1h (DIR-205). O cron de
  --     liquidação tenta a cada 10 min; enquanto falta saldo, nada acontece e
  --     ninguém sabia. Mesmo filtro do cron: fora plano, investimento e teste.
  select count(*), coalesce(max(extract(epoch from (now() - a.end_time)) / 3600), 0),
         coalesce(jsonb_agg(jsonb_build_object('leilao', a.id, 'titulo', a.title, 'vencedor', a.winner_name, 'valor', a.current_price,
           'saldo', round(coalesce(u.saldo_disponivel, 0) + coalesce(u.saldo_reservado, 0), 2),
           'horas', round(extract(epoch from (now() - a.end_time)) / 3600)) order by a.end_time), '[]'::jsonb)
    into _narr, _harr, _lista
    from public.auctions a left join public.app_users u on u.id = a.winner_id
   where a.order_status = 'awaiting_payment' and a.winner_id is not null and a.status in ('ended', 'sold', 'processing')
     and a.end_time < now() - interval '1 hour'
     and coalesce(a.is_test_auction, false) = false and coalesce(a.is_investment_plan, false) = false
     and a.title !~* '\mplano\M';
  if _narr > 0 then
    _alertas := _alertas || jsonb_build_object('codigo', 'arremate_sem_saldo', 'gravidade', case when _harr >= 48 then 'vermelho' else 'amarelo' end,
      'titulo', _narr || ' arremate(s) parado(s) por falta de saldo do vencedor' || case when _harr >= 48 then ' há mais de 48h — decidir: cobrar ou cancelar' else '' end,
      'detalhe', (select string_agg((x->>'titulo') || ' · ' || (x->>'vencedor') || ' · R$ ' || (x->>'valor') || ' (tem R$ ' || (x->>'saldo') || ', ' || (x->>'horas') || 'h)', '; ') from jsonb_array_elements(_lista) x));
  end if;

  return jsonb_build_object(
    'gerado_em', now(),
    'alertas', _alertas,
    'numeros', jsonb_build_object(
      'saldo_pessoas', _rel->'pessoas'->'saldo_total',
      'extrato_pessoas', _rel->'pessoas'->'extrato_total',
      'em_espera', _rel->'origens'->0->'em_espera',
      'em_espera_vencidas', _rel->'em_espera_vencidas',
      'indicacoes_a_conferir', jsonb_array_length(coalesce(_rel->'indicacoes_a_conferir', '[]'::jsonb)),
      'conciliacao_pendencias', jsonb_array_length(coalesce(_conc->'pendencias', '[]'::jsonb)),
      'webhook_horas_mudo', round(coalesce(_h, 0), 1),
      'arremates_sem_saldo', _narr,
      'robos', _robos
    )
  );
end;
$$;
revoke execute on function public.vigia_financeiro() from public, anon, authenticated;
