-- 🧾 DIR-201 (05/10/2026) — AS DECISÕES DA AUDITORIA DAS COMISSÕES
--
-- Dono, sobre as 5 decisões do relatório (docs/AUDITORIA_COMISSOES_2026-10-05.md):
-- "QUERO QUE VOCÊ DECIDA ISSO". Decidido e feito:
--
--   4.1/4.2  Compra paga com saldo de comissão passa a deixar RASTRO: uma linha
--            negativa em commission_records (papel 'compra_com_saldo') e um
--            lançamento em wallet_ledger. Assim o extrato volta a bater com o
--            saldo sem mexer em saldo nenhum. O passado (R$ 140,26 de 3 contas
--            internas) ganha a mesma linha, à parte desta migração.
--   4.9      A conta oficial da empresa NÃO recebe os 10% de indicação de
--            depósito dos clientes que ela mesma "indicou" (cadastro direto):
--            é dinheiro da empresa com a empresa e infla o relatório de
--            comissão. Vale daqui para a frente; as 7 linhas existentes
--            (R$ 507,70) são estornadas à parte, pela função de estorno.
--   4.5      Leilão continua pagando no martelo: o lance já reserva o saldo,
--            então o martelo é o pagamento (regra documentada). Sem mudança.
--   4.7      As 16 vendas Nexus de 03–15/08 NÃO ganham comissão retroativa:
--            a regra de comissionar venda Nexus começou em 15/08 e o dono
--            mandou zerar as comissões das pessoas envolvidas em 28/09.
--   4.10     Quem foi zerado em 28/09 mantém o cargo: zerar saldo acertou o
--            passado, não tirou ninguém da rede. Sem mudança.

-- ── 1) a empresa fora dos 10% de indicação de depósito ──────────────────────
create or replace function public.trg_deposito_paga_indicador()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  _quem_indicou text;
  _ind          record;
  _valor        numeric;
  _comissao     numeric;
begin
  if coalesce(new.kind,'') <> 'wallet_deposit' then return new; end if;
  if coalesce(new.status,'') <> 'paid' then return new; end if;
  if tg_op = 'UPDATE' and coalesce(old.status,'') = 'paid' then return new; end if;
  if coalesce(new.created_date, new.created_at, now()) < public._indicacao_deposito_inicio() then
    return new;
  end if;

  _valor := round(coalesce(new.total_amount,0)::numeric, 2);
  if _valor <= 0 then return new; end if;
  if new.buyer_id is null then return new; end if;

  select u.referred_by_id into _quem_indicou
    from public.app_users u where u.id = new.buyer_id;
  if _quem_indicou is null then return new; end if;
  if _quem_indicou = new.buyer_id then return new; end if;

  select a.id, a.full_name, a.primary_career_level, a.active, a.referral_code
    into _ind
    from public.app_users a where a.id = _quem_indicou;
  if _ind.id is null then return new; end if;
  if _ind.active is false then return new; end if;
  -- 🏢 DIR-201: a conta oficial não é indicadora. Cliente de cadastro direto
  -- aponta para ela por padrão; os 10% desse depósito não são comissão.
  if coalesce(_ind.referral_code, '') = 'leilaonozap' or _ind.full_name = 'Leilão NoZap - Site Oficial' then return new; end if;

  _comissao := round(_valor * public._indicacao_deposito_pct() / 100.0, 2);
  if _comissao <= 0 then return new; end if;

  insert into public.commission_ledger
    (sale_id, beneficiary_id, beneficiary_name, beneficiary_level,
     role_in_sale, pct, amount, status, release_at)
  values
    (new.id, _ind.id, _ind.full_name, _ind.primary_career_level,
     'indicacao_deposito', public._indicacao_deposito_pct(), _comissao, 'a_liberar',
     coalesce(new.created_date, new.created_at, now())
       + (public._indicacao_deposito_dias() || ' days')::interval)
  on conflict do nothing;

  return new;
end;
$$;

-- ── 2) compra com saldo de comissão deixa rastro ────────────────────────────
-- Definição viva do banco (pg_get_functiondef, 05/10/2026) com UM acréscimo,
-- marcado "DIR-201": depois de gravar a venda, se parte foi paga com comissão,
-- nasce a linha negativa no extrato e o lançamento na carteira.
create or replace function public.comprar_com_saldo(_buyer text, _items jsonb, _seller text default null::text, _buyer_name text default null::text, _buyer_phone text default null::text, _address text default null::text, _cep text default null::text, _coupon text default null::text)
returns json language plpgsql security definer set search_path to 'public' as $function$
declare
  it jsonb; v_pid text; v_qty int; v_price numeric; v_stock numeric; v_title text; v_img text;
  v_subtotal numeric := 0; v_total numeric := 0; v_desc numeric := 0; v_qtytot int := 0;
  v_seller text; v_sale text; v_cup json; v_code text := null; v_cupid text := null;
  v_first_title text; v_first_img text; v_first_pid text;
  -- 💳 as duas carteiras
  v_deposito numeric; v_comissao numeric;
  v_comprometido numeric := 0; v_livre_deposito numeric; v_poder numeric; v_reservado numeric;
  v_do_deposito numeric; v_da_comissao numeric;
  v_buyer_nome text;
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
  select coalesce(saldo_disponivel,0), coalesce(commission_balance,0), coalesce(saldo_reservado,0), full_name
    into v_deposito, v_comissao, v_reservado, v_buyer_nome
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
     group by m.auction_id
  ) t;
  -- 🔧 o que já está em saldo_reservado saiu do disponível: descontar de novo
  -- cobraria a mesma quantia duas vezes da mesma pessoa (ver cabeçalho)
  v_comprometido := round(greatest(0, coalesce(v_comprometido, 0) - v_reservado), 2);

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

  -- 🧾 DIR-201: a parte paga com COMISSÃO deixa rastro — linha negativa no
  -- extrato (a tela mostra "Usado em compra") e lançamento na carteira.
  -- Sem isto o saldo caía e a linha "Gerada" ficava aberta (R$ 140,26 em 3 contas).
  if v_da_comissao > 0 then
    insert into commission_records (user_id, user_name, amount, percent, role, sale_id, sale_type, sale_amount, product_title, status, created_date)
    values (_buyer, coalesce(_buyer_name, v_buyer_nome), -v_da_comissao, 0, 'compra_com_saldo', v_sale, 'uso', v_total,
            'Usado em compra na loja — ' || coalesce(v_first_title, 'pedido') || ' (' || to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM') || ')',
            'confirmed', now());
    insert into wallet_ledger (user_id, sale_id, tipo, valor, saldo_antes, saldo_depois, motivo, origem)
    values (_buyer, v_sale, 'compra_com_comissao', -v_da_comissao, v_comissao, round(v_comissao - v_da_comissao, 2),
            'Compra na loja paga com saldo de comissão', 'sql/comprar_com_saldo');
  end if;

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

-- ── ROTEIRO DO PASSADO (feito à parte, fora desta migração) ──────────────────
-- • 3 linhas 'compra_com_saldo' negativas (Luiz −105,09 · Beatriz −20,58 ·
--   Luciano −14,59), sale_type 'ajuste', fechando extrato = saldo. Saldo não muda.
-- • select estornar_comissoes_do_deposito(<venda>, 'DIR-201 ...') nas 7 vendas
--   cuja indicação caía na conta oficial (R$ 505 em espera canceladas; R$ 2,70
--   liberados estornados do saldo da empresa).
