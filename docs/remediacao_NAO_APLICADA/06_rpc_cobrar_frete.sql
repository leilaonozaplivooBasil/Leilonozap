-- ⛔ NÃO APLICADO · TIPO: DDL_MIGRATION · RISCO: BAIXO
-- ════════════════════════════════════════════════════════════════════════════
-- A FORMA CERTA DE COBRAR O FRETE PENDENTE: uma transação só
-- ════════════════════════════════════════════════════════════════════════════
-- `api/functions/cobrarFretePendente.js` hoje faz três escritas separadas com
-- COMPENSAÇÃO: marca, debita, grava, e estorna se a gravação falhar. Funciona e
-- está testado — mas compensação não é transação. Se o processo morrer entre o
-- débito e o estorno, sobra pendência para intervenção manual.
--
-- Esta função faz as duas escritas dentro de um BEGIN/COMMIT implícito do
-- PostgreSQL: ou as duas acontecem, ou nenhuma.
--
-- ⚠️ SÓ `service_role` EXECUTA. A auditoria de 21/08 encontrou 26 funções
-- SECURITY DEFINER abertas ao anônimo — esta nasce fechada, e o REVOKE vem
-- antes do GRANT de propósito.
--
-- ⚠️ NÃO APLICAR sem: (1) autorização do dono; (2) a OpenAI revisar; (3) a rota
-- passar a chamá-la em vez do caminho de compensação.

CREATE OR REPLACE FUNCTION public.cobrar_frete_pendente(
  _sale_id  text,
  _valor    numeric,
  _raw      jsonb,
  _actor    text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _venda   record;
  _saldo   numeric;
  _novo    numeric;
BEGIN
  IF _valor IS NULL OR _valor <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'valor_invalido');
  END IF;

  -- trava a linha da venda: duas cobranças simultâneas fazem fila aqui
  SELECT id, kind, buyer_id, raw_base44 INTO _venda
    FROM public.catalog_sales WHERE id = _sale_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'pedido_nao_encontrado');
  END IF;
  IF _venda.kind IS DISTINCT FROM 'arremate' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_e_arremate');
  END IF;
  IF COALESCE((_venda.raw_base44 -> 'frete' ->> 'valor')::numeric, 0) > 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ja_tem_frete');
  END IF;

  -- trava a linha do comprador: o saldo não muda debaixo da gente
  SELECT COALESCE(saldo_disponivel, 0) INTO _saldo
    FROM public.app_users WHERE id = _venda.buyer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'comprador_nao_encontrado');
  END IF;
  IF _saldo < _valor THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'saldo_insuficiente',
                              'saldo', _saldo, 'falta', round(_valor - _saldo, 2));
  END IF;

  _novo := round(_saldo - _valor, 2);

  -- ── as duas escritas, na mesma transação ──────────────────────────────────
  UPDATE public.app_users SET saldo_disponivel = _novo WHERE id = _venda.buyer_id;
  UPDATE public.catalog_sales SET raw_base44 = _raw WHERE id = _sale_id;

  INSERT INTO public.wallet_ledger (user_id, sale_id, tipo, valor, motivo, created_at)
  VALUES (_venda.buyer_id, _sale_id, 'cobranca_frete_pendente', -_valor,
          'Frete nao cobrado no arremate — cobranca posterior por ' || COALESCE(_actor, '?'), now());

  RETURN jsonb_build_object('ok', true, 'saldo_antes', _saldo, 'saldo_depois', _novo, 'valor', _valor);
END $$;

-- fechada por padrão; só o servidor executa
REVOKE ALL ON FUNCTION public.cobrar_frete_pendente(text, numeric, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cobrar_frete_pendente(text, numeric, jsonb, text) TO service_role;

-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- DROP FUNCTION IF EXISTS public.cobrar_frete_pendente(text, numeric, jsonb, text);
-- A rota volta sozinha para o caminho de compensação, que continua no código.
