-- 🛡️ DIR-204 (07/10/2026) — O SISTEMA QUE VIGIA O SISTEMA + O FECHAMENTO DO DIA
--
-- Dono: "quais automações seriam de fato importantes… tipo equipe sênior";
-- depois: "cirúrgicas, não quebre nada que esteja funcionando, só melhore".
--
-- Duas funções SÓ DE LEITURA (nenhuma escreve em tabela nenhuma):
--   vigia_financeiro()  — confere as regras do dinheiro e devolve os alertas
--                         (saldo × extrato, liberação atrasada, venda paga sem
--                         comissão, leilão encerrado sem comissão, indicação a
--                         conferir, crédito que falhou, cupom sem depósito,
--                         conciliação pendente, webhook mudo, robô parado).
--   fechamento_diario() — os números de um dia (Brasília): entradas, saídas,
--                         comissões, saldos, auditoria, cadastros, leilões.
-- Quem lê e avisa é o servidor (api/functions/vigiaFinanceiro.js e
-- fechamentoDiario.js), pelo WhatsApp de administrador já existente.

create or replace function public.vigia_financeiro()
returns jsonb language plpgsql security definer stable set search_path to 'public' as $$
declare
  _rel jsonb; _conc jsonb; _alertas jsonb := '[]'::jsonb; _n int; _v numeric; _lista jsonb; _robos jsonb := '[]'::jsonb; _h numeric;
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
      'robos', _robos
    )
  );
end;
$$;
revoke execute on function public.vigia_financeiro() from public, anon, authenticated;

create or replace function public.fechamento_diario(_dia date default ((now() at time zone 'America/Sao_Paulo')::date - 1))
returns jsonb language plpgsql security definer stable set search_path to 'public' as $$
declare
  _ini timestamptz := (_dia::timestamp) at time zone 'America/Sao_Paulo';
  _fim timestamptz := ((_dia + 1)::timestamp) at time zone 'America/Sao_Paulo';
  _rel jsonb; _vig jsonb;
  _pagos text[] := array['paid','pago','entregue','shipped','delivered','preparando','saiu_entrega','confirmado','concluido','enviado'];
  _nao_loja text[] := array['wallet_deposit','arremate','passaporte','commission_deposit','operacao_deposit','seller_freight','reposicao'];
  _emp text[];
begin
  _rel := public.relatorio_comissoes();
  _vig := public.vigia_financeiro();
  select coalesce(array_agg(id), '{}') into _emp from public.app_users where referral_code = 'leilaonozap' or full_name = 'Leilão NoZap - Site Oficial';

  return jsonb_build_object(
    'dia', _dia, 'de', _ini, 'ate', _fim, 'gerado_em', now(),
    'entradas', jsonb_build_object(
      'depositos', (select jsonb_build_object('n', count(*), 'total', round(coalesce(sum(total_amount), 0), 2)) from public.catalog_sales where kind = 'wallet_deposit' and lower(coalesce(status, '')) = 'paid' and created_at >= _ini and created_at < _fim),
      'loja', (select jsonb_build_object('n', count(*), 'total', round(coalesce(sum(total_amount), 0), 2)) from public.catalog_sales where coalesce(kind, 'loja') <> all(_nao_loja) and lower(coalesce(status, '')) = any(_pagos) and created_at >= _ini and created_at < _fim),
      'arremates_pagos', (select jsonb_build_object('n', count(*), 'total', round(coalesce(sum(total_amount), 0), 2)) from public.catalog_sales where kind = 'arremate' and lower(coalesce(status, '')) = any(_pagos) and created_at >= _ini and created_at < _fim),
      'liquido_gateway', (select round(coalesce(sum((gateway->>'liquido')::numeric), 0), 2) from public.catalog_sales where gateway ? 'liquido' and created_at >= _ini and created_at < _fim and coalesce(gateway->>'situacao', '') = 'liberado')
    ),
    'saidas', jsonb_build_object(
      'avisos_dinheiro_saiu', (select count(*) from public.gateway_eventos where recebido_em >= _ini and recebido_em < _fim and situacao in ('devolvido', 'devolvido_parcial', 'chargeback', 'disputa', 'retido')),
      'bloqueado_na_carteira', (select round(coalesce(-sum(valor), 0), 2) from public.wallet_ledger where tipo = 'bloqueio_contestacao' and created_at >= _ini and created_at < _fim),
      'devolucoes_pelo_gateway', (select count(*) from public.gateway_acoes where acao = 'devolver' and status = 'feita' and executada_em >= _ini and executada_em < _fim)
    ),
    'comissoes', jsonb_build_object(
      'geradas', (select jsonb_build_object('n', count(*), 'total', round(coalesce(sum(amount), 0), 2)) from public.commission_records where created_at >= _ini and created_at < _fim and status <> 'reversed' and amount > 0 and not (user_id = any(_emp))),
      'empresa', (select round(coalesce(sum(amount), 0), 2) from public.commission_records where created_at >= _ini and created_at < _fim and status <> 'reversed' and user_id = any(_emp)),
      'em_espera_criadas', (select jsonb_build_object('n', count(*), 'total', round(coalesce(sum(amount), 0), 2)) from public.commission_ledger where role_in_sale = 'indicacao_deposito' and created_at >= _ini and created_at < _fim),
      'liberadas', (select jsonb_build_object('n', count(*), 'total', round(coalesce(sum(amount), 0), 2)) from public.commission_ledger where role_in_sale = 'indicacao_deposito' and status = 'disponivel' and released_at >= _ini and released_at < _fim),
      'pagas_na_mao', (select jsonb_build_object('n', count(*), 'total', round(coalesce(sum(valor), 0), 2)) from public.comissao_pagamentos_manuais where created_at >= _ini and created_at < _fim),
      'estornadas', (select jsonb_build_object('n', count(*), 'total', round(coalesce(sum(amount), 0), 2)) from public.commission_ledger where status in ('cancelado', 'estornado') and role_in_sale = 'indicacao_deposito' and released_at >= _ini and released_at < _fim)
    ),
    'saldos', jsonb_build_object(
      'pessoas', _rel->'pessoas'->'saldo_total',
      'em_espera', _rel->'origens'->0->'em_espera',
      'empresa', _rel->'empresa'->'saldo',
      'carteiras_clientes', (select round(coalesce(sum(saldo_disponivel), 0), 2) from public.app_users),
      'reservado_em_lances', (select round(coalesce(sum(saldo_reservado), 0), 2) from public.app_users)
    ),
    'bonus', jsonb_build_object(
      'liberado', (select round(coalesce(sum(valor_liberado), 0), 2) from public.passaporte_coupons where liberado_em >= _ini and liberado_em < _fim),
      'gastavel_total', (select round(coalesce(sum(saldo_restante), 0), 2) from public.passaporte_coupons)
    ),
    'movimento', jsonb_build_object(
      'cadastros', (select count(*) from public.app_users where created_at >= _ini and created_at < _fim),
      'leiloes_encerrados', (select jsonb_build_object('n', count(*), 'total', round(coalesce(sum(current_price), 0), 2)) from public.auctions where status = 'ended' and winner_id is not null and end_time >= _ini and end_time < _fim and coalesce(is_investment_plan, false) = false and coalesce(is_test_auction, false) = false and title not ilike '%plano de investimento%'),
      'lances', (select count(*) from public.auction_messages where message_type = 'bid' and created_at >= _ini and created_at < _fim),
      'arremates_a_pagar', (select jsonb_build_object('n', count(*), 'total', round(coalesce(sum(current_price), 0), 2)) from public.auctions where status = 'ended' and order_status = 'awaiting_payment' and coalesce(is_investment_plan, false) = false and title not ilike '%plano de investimento%')
    ),
    'auditoria', jsonb_build_object(
      'alertas', _vig->'alertas',
      'fora_do_extrato', jsonb_array_length(coalesce(_rel->'saldos_fora_do_extrato', '[]'::jsonb)),
      'em_espera_vencidas', _rel->'em_espera_vencidas',
      'indicacoes_a_conferir', jsonb_array_length(coalesce(_rel->'indicacoes_a_conferir', '[]'::jsonb)),
      'conciliacao_pendencias', _vig->'numeros'->'conciliacao_pendencias'
    )
  );
end;
$$;
revoke execute on function public.fechamento_diario(date) from public, anon, authenticated;
