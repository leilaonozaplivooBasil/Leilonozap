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
  _sale_id   text,
  _valor     numeric,
  _frete     jsonb,
  _actor     text,
  _endereco  jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- ⚠️ A ASSINATURA É INVARIANTE DE REGRESSÃO (achado A1).
-- Os nomes abaixo são exatamente os que a rota manda. NUNCA voltar a aceitar
-- `_user_id` ou `_actor_id`: argumento que não existe faz o PostgREST responder
-- 404, a rota lê 404 como "RPC não aplicada", e passaria a vida dizendo que
-- falta aplicar uma função que está aplicada. Falha silenciosa, invisível.
--
-- 🔴 BLOQUEADOR 19 — a função NÃO recebe mais o documento inteiro do pedido.
-- Antes o chamador lia `raw_base44` por HTTP, montava o documento e mandava
-- pronto. O `FOR UPDATE` impede duas cobranças concorrentes, mas não impede que
-- OUTRO fluxo tenha atualizado o pedido entre a leitura do chamador e a trava —
-- e aí a função gravava por cima com um documento velho. Agora ela recebe só o
-- bloco do frete e monta o documento em cima do `raw_base44` lido DENTRO da
-- própria trava, que é o único garantidamente atual.
DECLARE
  _venda   record;
  _saldo   numeric;
  _novo    numeric;
  _raw     jsonb;
BEGIN
  IF _valor IS NULL OR _valor <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'valor_invalido');
  END IF;
  IF _frete IS NULL OR jsonb_typeof(_frete) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'frete_invalido');
  END IF;

  -- ══════════════════════════════════════════════════════════════════════════
  -- 🔒 INVARIANTE EXIGIDA PELA AUDITORIA OPENAI (21/08/2026)
  -- ══════════════════════════════════════════════════════════════════════════
  -- A função debita `_valor` e grava `_frete` — dois números que vêm SEPARADOS
  -- do chamador. Nada garantia que fossem o mesmo. Um erro de montagem no
  -- servidor (ou uma chamada mal-intencionada, já que isto é SECURITY DEFINER)
  -- debitaria R$ 40 e gravaria "frete R$ 4". O cliente pagaria 40 e todo
  -- relatório diria 4 — divergência silenciosa, transação "bem-sucedida".
  -- Compara em CENTAVOS: dinheiro não depende de arredondamento de texto.
  IF round(COALESCE((_frete ->> 'valor')::numeric, -1), 2) IS DISTINCT FROM round(_valor, 2) THEN
    RETURN jsonb_build_object(
      'ok', false, 'motivo', 'raw_nao_bate_com_valor',
      'valor_debitado_pedido', _valor,
      'valor_no_raw', (_frete ->> 'valor')
    );
  END IF;

  -- trava a linha da venda: duas cobranças simultâneas fazem fila aqui
  SELECT id, kind, buyer_id, raw_base44, total_amount INTO _venda
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
  -- cobrança de outro processo ainda em aberto: não empilha
  IF _venda.raw_base44 -> 'frete' -> 'cobranca_em_andamento' IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'cobranca_em_andamento');
  END IF;

  -- ── documento novo montado AQUI, sobre o raw lido dentro do FOR UPDATE ─────
  _raw := COALESCE(_venda.raw_base44, '{}'::jsonb)
          || jsonb_build_object(
               'delivery_type', 'delivery',
               'frete', _frete,
               'amount_charged', round(
                 COALESCE((_venda.raw_base44 ->> 'amount_charged')::numeric,
                          _venda.total_amount, 0) + _valor, 2)
             );
  IF _endereco IS NOT NULL AND jsonb_typeof(_endereco) = 'object' THEN
    _raw := _raw || jsonb_build_object('address', _endereco);
  END IF;

  -- O pedido tem que sair como ENTREGA. Cobrar frete e gravar 'pickup' é o
  -- defeito F9 entrando pela porta dos fundos.
  IF COALESCE(_raw ->> 'delivery_type', '') IS DISTINCT FROM 'delivery' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'raw_nao_e_delivery');
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
-- ⚠️ A assinatura mudou (B19: recebe `_frete`, não o documento inteiro).
-- Se a versão de 4 argumentos tiver sido aplicada em algum momento, ela PRECISA
-- sair: duas sobrecargas com o mesmo nome deixam o PostgREST ambíguo e ele passa
-- a recusar as duas com PGRST203 — que a rota leria como "RPC não aplicada".
DROP FUNCTION IF EXISTS public.cobrar_frete_pendente(text, numeric, jsonb, text);

REVOKE ALL ON FUNCTION public.cobrar_frete_pendente(text, numeric, jsonb, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cobrar_frete_pendente(text, numeric, jsonb, text, jsonb) TO service_role;

-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- DROP FUNCTION IF EXISTS public.cobrar_frete_pendente(text, numeric, jsonb, text);
-- A rota volta sozinha para o caminho de compensação, que continua no código.
