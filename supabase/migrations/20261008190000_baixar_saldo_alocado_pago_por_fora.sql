-- ══════════════════════════════════════════════════════════════════════════
-- 🧾 DIR-209 (08/10/2026) — SAQUE PAGO POR FORA SEM BAIXAR O saldo_alocado
--
-- Achado da auditoria dos depósitos (verificador independente): Elenice Lima
-- pediu 3 saques de R$ 80 em 26/09 (o pedido move commission_balance →
-- saldo_alocado). Em 28/09, por ordem do dono, a comissão dela foi zerada e os
-- 3 saques foram marcados 'paid' à mão, "pagos por fora", sem passar por
-- approveWithdrawal.js — que é quem baixa o saldo_alocado. Resultado: R$ 240
-- ficaram "alocados" na carteira sem nenhum saque na fila. Passivo fantasma e
-- risco de pagar duas vezes se alguém um dia "devolver" o alocado.
--
-- Esta função faz a baixa com rastro (wallet_ledger + system_logs), com trava
-- de linha e sem deixar saldo negativo. Serve para qualquer caso igual.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.baixar_saldo_alocado_pago_por_fora(_user_id text, _valor numeric, _motivo text, _por text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _u    record;
  _novo numeric;
begin
  if coalesce(_valor, 0) <= 0 then
    return jsonb_build_object('success', false, 'error', 'valor_invalido');
  end if;

  select id, full_name, coalesce(saldo_alocado, 0) as saldo_alocado
    into _u from public.app_users where id = _user_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'usuario_nao_encontrado');
  end if;
  if _u.saldo_alocado < _valor then
    return jsonb_build_object('success', false, 'error', 'saldo_alocado_menor', 'saldo_alocado', _u.saldo_alocado);
  end if;

  _novo := round(_u.saldo_alocado - _valor, 2);
  update public.app_users set saldo_alocado = _novo where id = _user_id;

  insert into public.wallet_ledger (user_id, tipo, valor, saldo_antes, saldo_depois, motivo, origem)
  values (_user_id, 'baixa_saque_pago_por_fora', -_valor, _u.saldo_alocado, _novo, _motivo, _por);

  insert into public.system_logs (component_name, step, status, message, payload, created_at)
  values ('baixar_saldo_alocado_pago_por_fora', 'BAIXA', 'info',
          'Baixa de R$ ' || _valor || ' do saldo_alocado de ' || coalesce(_u.full_name, _user_id) || ': ' || _motivo,
          jsonb_build_object('user_id', _user_id, 'valor', _valor, 'antes', _u.saldo_alocado, 'depois', _novo, 'por', _por), now());

  return jsonb_build_object('success', true, 'user_id', _user_id, 'saldo_alocado_antes', _u.saldo_alocado, 'saldo_alocado_depois', _novo);
end;
$$;

revoke all on function public.baixar_saldo_alocado_pago_por_fora(text, numeric, text, text) from public, anon, authenticated;

comment on function public.baixar_saldo_alocado_pago_por_fora(text, numeric, text, text) is
  'DIR-209 (08/10/2026): baixa saldo_alocado de saque marcado como pago por fora, com rastro em wallet_ledger e system_logs. Só service_role.';
