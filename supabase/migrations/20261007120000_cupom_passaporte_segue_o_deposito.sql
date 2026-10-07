-- 🎟️ DIR-202 (07/10/2026) — O CUPOM PASSAPORTE (bônus de 10%) SEGUE O DEPÓSITO
--
-- Dono, com print de cliente ("as pessoas que estão dando lance não estão
-- recebendo os 10%; não está constando mais"): "auditoria extremamente
-- diligente, sem quebrar nada, para não ter mais nenhum erro."
--
-- Auditado em 07/10: o motor do bônus está certo — todo depósito pago ganha o
-- cupom de 10% (bloqueado), e cada leilão que termina libera a fatia de quem
-- perdeu (15 fatias no iPhone 17 em 02/10). O que havia:
--   • TELA: o cartão da Carteira escondia o valor GUARDADO quando a pessoa já
--     tinha algum crédito liberado — quem depositou R$ 3.000 e tinha R$ 15
--     liberados via "R$ 15" e nada dos R$ 300 esperando o leilão. Corrigido
--     no PassaporteCard (mostra os dois).
--   • FURO: depósito devolvido/contestado no gateway bloqueava a carteira e
--     cortava a comissão de indicação (DIR-198), mas o cupom de 10% ficava
--     de pé — R$ 310 gastáveis na loja sobre R$ 3.300 que voltaram ao pagador
--     (Diogo, 02/10). Esta migração fecha o furo: bloquear o depósito cancela
--     o cupom; cancelar a venda do depósito cancela o cupom.

-- ── 1) cancela o cupom de UM depósito (bloqueado e o liberado ainda não gasto) ─
create or replace function public.cancelar_cupom_passaporte_do_deposito(_sale_id text, _motivo text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  _c record; _bloq numeric := 0; _lib numeric := 0; _usado numeric := 0;
begin
  select id, valor_credito, valor_liberado, valor_cancelado, saldo_restante, status, bonus_creditado_em
    into _c from public.passaporte_coupons where origin_sale_id = _sale_id;
  if not found then return jsonb_build_object('success', true, 'sem_cupom', true, 'sale_id', _sale_id); end if;
  -- modelo A (bônus já somado na carteira em 08/2026): a carteira bloqueada já cobre; nada a fazer aqui
  if _c.bonus_creditado_em is not null then return jsonb_build_object('success', true, 'modelo_a', true, 'sale_id', _sale_id); end if;
  _bloq  := round(greatest(0, coalesce(_c.valor_credito, 0) - coalesce(_c.valor_liberado, 0) - coalesce(_c.valor_cancelado, 0)), 2);
  _lib   := round(greatest(0, coalesce(_c.saldo_restante, 0)), 2);
  _usado := round(greatest(0, coalesce(_c.valor_liberado, 0) - _lib), 2);
  update public.passaporte_coupons
     set valor_cancelado = round(coalesce(valor_cancelado, 0) + _bloq + _lib, 2),
         saldo_restante  = 0,
         status          = 'cancelado'
   where id = _c.id;
  return jsonb_build_object('success', true, 'sale_id', _sale_id, 'cupom', _c.id, 'motivo', _motivo,
    'cancelado_bloqueado', _bloq, 'cancelado_liberado', _lib, 'ja_usado_na_loja', _usado);
end;
$$;
revoke execute on function public.cancelar_cupom_passaporte_do_deposito(text, text) from public, anon, authenticated;

-- ── 2) bloquear o depósito contestado cancela o cupom (sempre, como a comissão) ─
create or replace function public.bloquear_saldo_contestado(_sale_id text, _motivo text default null, _origem text default 'conciliacao')
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  _s record; _antes numeric; _bloqueado numeric; _faltou numeric; _ultimo text; _comissoes jsonb; _cupom jsonb;
begin
  select id, buyer_id, kind, status, coalesce(total_amount, sale_price, 0)::numeric as valor into _s from public.catalog_sales where id = _sale_id;
  if not found then return jsonb_build_object('success', false, 'error', 'venda_nao_encontrada'); end if;
  if _s.kind not in ('wallet_deposit') then return jsonb_build_object('success', false, 'error', 'nao_e_deposito_na_carteira', 'kind', _s.kind); end if;
  -- 🧾 DIR-198: dinheiro que saiu não paga comissão de indicação. Sempre, mesmo se o bloqueio já existia.
  _comissoes := public.estornar_comissoes_do_deposito(_sale_id, coalesce(_motivo, 'Depósito contestado no gateway'));
  -- 🎟️ DIR-202: e não ganha bônus de 10% na loja. Sempre, pelo mesmo motivo.
  _cupom := public.cancelar_cupom_passaporte_do_deposito(_sale_id, coalesce(_motivo, 'Depósito contestado no gateway'));
  select tipo into _ultimo from public.wallet_ledger where sale_id = _sale_id and tipo in ('bloqueio_contestacao', 'liberacao_contestacao') order by created_at desc limit 1;
  if _ultimo = 'bloqueio_contestacao' then return jsonb_build_object('success', true, 'ja_bloqueado', true, 'bloqueado', 0, 'comissoes', _comissoes, 'cupom', _cupom); end if;
  select coalesce(saldo_disponivel, 0) into _antes from public.app_users where id = _s.buyer_id for update;
  if _antes is null then return jsonb_build_object('success', false, 'error', 'comprador_nao_encontrado'); end if;
  _bloqueado := least(_antes, _s.valor);
  _faltou := round(_s.valor - _bloqueado, 2);
  update public.app_users set saldo_disponivel = round(_antes - _bloqueado, 2) where id = _s.buyer_id;
  insert into public.wallet_ledger (user_id, sale_id, tipo, valor, saldo_antes, saldo_depois, motivo, origem)
  values (_s.buyer_id, _sale_id, 'bloqueio_contestacao', -_bloqueado, _antes, round(_antes - _bloqueado, 2),
          coalesce(_motivo, 'Depósito contestado no gateway: saldo bloqueado até a resolução'), _origem);
  return jsonb_build_object('success', true, 'sale_id', _sale_id, 'user_id', _s.buyer_id, 'valor', round(_s.valor, 2), 'bloqueado', round(_bloqueado, 2), 'nao_recuperado', _faltou, 'saldo_antes', round(_antes, 2), 'saldo_depois', round(_antes - _bloqueado, 2), 'comissoes', _comissoes, 'cupom', _cupom);
exception when unique_violation then
  return jsonb_build_object('success', false, 'error', 'ja_houve_bloqueio_antes', 'sale_id', _sale_id);
end;
$$;
revoke execute on function public.bloquear_saldo_contestado(text, text, text) from public, anon, authenticated;

-- ── ROTEIRO DO PASSADO (feito à parte) ───────────────────────────────────────
-- select cancelar_cupom_passaporte_do_deposito(<venda>, 'DIR-202: depósito devolvido pelo gateway em 02/10')
-- nas 4 vendas do Diogo (R$ 310 liberados e R$ 20 guardados cancelados; nada tinha sido gasto).
