-- ⏪ VOLTA A `comprar_com_saldo` PARA O COMPORTAMENTO DA #379 — retorno de emergência
--
-- NÃO É MIGRAÇÃO. Está fora de supabase/migrations/ de propósito: o CLI não pode
-- aplicar isto sozinho. É o texto pronto para colar caso a correção da trava
-- (20260917_trava_do_leilao_sem_desconto_duplo) precise ser desfeita às pressas.
--
-- O corpo abaixo é EXTRAÍDO do arquivo da #379, não redigitado — então é
-- exatamente o que estava no ar antes da correção, sem risco de eu errar uma
-- linha no meio de uma emergência.
--
-- COMO USAR: aplicar este arquivo inteiro. `CREATE OR REPLACE` substitui a função
-- no lugar; não precisa derrubar nada, não há migração para reverter, e nenhuma
-- venda já gravada é afetada (a função só decide dinheiro no momento da compra).
--
-- EFEITO DE VOLTAR: a conta que hoje tem R$ 426,78 travados indevidamente volta a
-- ver R$ 0,00 de poder de compra. Nada é perdido — só volta a ficar preso.
--
-- O lado do JS (api/_lib/compromissoLeilao.js) volta pelo git, revertendo a PR.

CREATE OR REPLACE FUNCTION public.comprar_com_saldo(
  _buyer text,
  _items jsonb,
  _seller text DEFAULT NULL::text,
  _buyer_name text DEFAULT NULL::text,
  _buyer_phone text DEFAULT NULL::text,
  _address text DEFAULT NULL::text,
  _cep text DEFAULT NULL::text,
  _coupon text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  it jsonb; v_pid text; v_qty int; v_price numeric; v_stock numeric; v_title text; v_img text;
  v_subtotal numeric := 0; v_total numeric := 0; v_desc numeric := 0; v_qtytot int := 0;
  v_seller text; v_sale text; v_cup json; v_code text := null; v_cupid text := null;
  v_first_title text; v_first_img text; v_first_pid text;
  -- 💳 as duas carteiras
  v_deposito numeric; v_comissao numeric;
  v_comprometido numeric := 0; v_livre_deposito numeric; v_poder numeric;
  v_do_deposito numeric; v_da_comissao numeric;
begin
  if _buyer is null or jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items)=0 then
    return json_build_object('ok', false, 'error', 'Pedido inválido');
  end if;
  for it in select * from jsonb_array_elements(_items) loop
    v_pid := it->>'product_id'; v_qty := greatest(1, coalesce((it->>'qty')::int, 1));
    select price_catalog, coalesce(quantity,0), description, image_urls->>0
      into v_price, v_stock, v_title, v_img
      from products where id = v_pid and catalog_active;
    if v_price is null or v_price <= 0 then return json_build_object('ok', false, 'error', 'Produto indisponível'); end if;
    if v_stock < v_qty then return json_build_object('ok', false, 'error', 'Estoque insuficiente: '||coalesce(v_title,'item')); end if;
    v_subtotal := v_subtotal + v_price * v_qty; v_qtytot := v_qtytot + v_qty;
    if v_first_pid is null then v_first_pid := v_pid; v_first_title := v_title; v_first_img := v_img; end if;
  end loop;
  v_subtotal := round(v_subtotal, 2);
  if v_subtotal <= 0 then return json_build_object('ok', false, 'error', 'Pedido vazio'); end if;

  v_seller := coalesce(_seller, (select referred_by_id from app_users where id = _buyer), '696bcc0831b99360419f7053');

  -- cupom (desconto server-side)
  v_total := v_subtotal;
  if _coupon is not null and btrim(_coupon) <> '' then
    v_cup := aplicar_cupom(_coupon, v_subtotal, v_seller);
    if (v_cup->>'valido')::boolean then
      v_desc := coalesce((v_cup->>'desconto')::numeric, 0);
      v_total := coalesce((v_cup->>'total_final')::numeric, v_subtotal);
      v_code := v_cup->>'code'; v_cupid := v_cup->>'coupon_id';
    end if;
  end if;
  v_total := round(v_total, 2);

  -- 🔒 trava a linha do comprador: daqui até o update ninguém mexe nas carteiras
  select coalesce(saldo_disponivel,0), coalesce(commission_balance,0)
    into v_deposito, v_comissao
    from app_users where id = _buyer for update;
  if v_deposito is null then return json_build_object('ok', false, 'error', 'Usuário inválido'); end if;

  -- 🔴 quanto do depósito está preso em leilão VIVO (ver cabeçalho)
  select coalesce(sum(maior), 0) into v_comprometido from (
    select max(coalesce(m.bid_amount,0) + coalesce(m.frete_amount,0)) as maior
      from auction_messages m
      join auctions a on a.id = m.auction_id
     where m.sender_id = _buyer
       and m.message_type = 'bid'
       and a.status = 'active'
       and coalesce(a.winner_id, '') <> _buyer
     group by m.auction_id
  ) t;
  v_comprometido := round(coalesce(v_comprometido, 0), 2);

  v_livre_deposito := round(greatest(0, v_deposito - v_comprometido), 2);
  v_poder := round(v_livre_deposito + v_comissao, 2);

  if v_poder < v_total then
    return json_build_object(
      'ok', false, 'error', 'Saldo insuficiente',
      'saldo', v_poder, 'total', v_total,
      'saldo_deposito', v_livre_deposito, 'saldo_comissao', v_comissao,
      'comprometido_leilao', v_comprometido
    );
  end if;

  -- depósito primeiro, comissão só no que sobrar
  v_do_deposito := round(least(v_livre_deposito, v_total), 2);
  v_da_comissao := round(v_total - v_do_deposito, 2);

  update app_users
     set saldo_disponivel   = round(coalesce(saldo_disponivel,0)   - v_do_deposito, 2),
         commission_balance = round(coalesce(commission_balance,0) - v_da_comissao, 2)
   where id = _buyer;

  for it in select * from jsonb_array_elements(_items) loop
    update products set quantity = greatest(0, coalesce(quantity,0) - greatest(1, coalesce((it->>'qty')::int,1)))
      where id = it->>'product_id';
  end loop;
  if v_cupid is not null then update coupons set uso_count = uso_count + 1 where id = v_cupid; end if;

  v_sale := substr(md5('saldo-'||_buyer||clock_timestamp()::text), 1, 24);
  insert into catalog_sales (id, base44_id, buyer_id, buyer_name, buyer_phone, seller_id,
    product_id, product_title, product_image, sale_price, total_amount, quantity,
    status, payment_method, kind, source, store_slug, tracking_code,
    buyer_address, buyer_cep, items_json, coupon_code, discount_amount, created_at, created_date, updated_at)
  values (v_sale, v_sale, _buyer, _buyer_name, _buyer_phone, v_seller,
    v_first_pid, v_first_title, v_first_img, v_total, v_total, v_qtytot,
    'paid', 'saldo', 'loja', 'saldo', 'bangu', 'LZ'||upper(substr(v_sale,1,8)),
    _address, _cep, _items, v_code, nullif(v_desc,0), now(), now(), now());

  return json_build_object('ok', true, 'sale_id', v_sale, 'total', v_total, 'subtotal', v_subtotal,
    'desconto', v_desc, 'cupom', v_code,
    -- 'novo_saldo' segue existindo com o MESMO sentido de antes (poder de compra
    -- que sobrou), pra não quebrar quem já lê esse campo
    'novo_saldo', round(v_poder - v_total, 2),
    'pago_com_deposito', v_do_deposito, 'pago_com_comissao', v_da_comissao,
    'saldo_deposito', round(v_deposito - v_do_deposito, 2),
    'saldo_comissao', round(v_comissao - v_da_comissao, 2),
    'comprometido_leilao', v_comprometido,
    'tracking', 'LZ'||upper(substr(v_sale,1,8)));
exception when others then
  return json_build_object('ok', false, 'error', SQLERRM);
end $function$;
