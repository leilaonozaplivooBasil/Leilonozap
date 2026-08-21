-- ══════════════════════════════════════════════════════════════════════════
-- 🔴 PONTO 126 (21/08/2026) — FASE 2: RESERVA COM VALIDADE (mata o PIX duplo).
--
-- A Fase 1 (já em produção) fecha a baixa silenciosa, mas não fecha o furo
-- #1 do diagnóstico de 20/08: "ninguém segura a peça entre o comprar e o
-- pagou". Hoje (conferido em createMPPix.js e createMPCatalogCardCheckout.js
-- — as duas rotas que o carrinho principal usa) NÃO EXISTE checagem de
-- estoque nenhuma no checkout: dois compradores da última peça passam os
-- dois, os dois geram PIX, os dois podem pagar — o segundo vira reembolso
-- manual, sem ninguém saber até o cliente reclamar.
--
-- REGRA: disponível pra vender = quantity − soma das reservas ATIVAS e não
-- vencidas. `quantity` continua significando "peça no depósito" — não muda
-- de sentido, só ganha uma camada de "peça já prometida a alguém".
--
-- owner_id NULL = estoque central (products.quantity). owner_id preenchido
-- = estoque próprio do lojista (store_inventory), mesma tabela pros dois
-- casos — evita duplicar a lógica de disponibilidade em dois lugares.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.estoque_reservas (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null,
  owner_id    text,                              -- null = estoque central
  sale_id     text not null,
  qty         numeric not null check (qty > 0),
  status      text not null default 'ativa',     -- ativa | consumida | expirada
  expira_em   timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists estoque_reservas_produto_status_idx
  on public.estoque_reservas (product_id, owner_id, status);
create index if not exists estoque_reservas_expiracao_idx
  on public.estoque_reservas (status, expira_em);
create index if not exists estoque_reservas_venda_idx
  on public.estoque_reservas (sale_id);

comment on table public.estoque_reservas is
  'PONTO 126 (21/08/2026): trava a peca entre "comprar" e "pagou". Disponivel = quantity - soma(reservas ativa e nao vencida).';

-- ─────────────────────────────────────────────────────────────────────────
-- reservar_estoque — confere disponível e insere na MESMA operação. A trava
-- de corrida é o próprio `for update`: dois checkouts da última peça,
-- simultâneos, serializam na linha do produto — só um vê disponível > 0.
-- Idempotente por (sale_id, product_id, owner_id): reservar de novo pra
-- mesma venda não duplica nem conta duas vezes.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.reservar_estoque(
  _product_id text, _owner_id text, _sale_id text, _qty numeric, _minutos_validade int default 30
)
returns jsonb language plpgsql security definer as $$
declare
  _base       numeric;
  _reservado  numeric;
  _disponivel numeric;
begin
  if _product_id is null or _sale_id is null or _qty is null or _qty <= 0 then
    return jsonb_build_object('success', false, 'error', 'parametros invalidos');
  end if;

  if exists (
    select 1 from public.estoque_reservas
     where sale_id = _sale_id and product_id = _product_id
       and coalesce(owner_id, '') = coalesce(_owner_id, '') and status = 'ativa'
  ) then
    return jsonb_build_object('success', true, 'ja_reservado', true);
  end if;

  if _owner_id is null then
    select coalesce(quantity, 0) into _base from public.products where id = _product_id for update;
  else
    select coalesce(sum(quantity), 0) into _base
      from public.store_inventory
     where owner_id = _owner_id and product_id = _product_id
     for update;
  end if;

  if _base is null then
    return jsonb_build_object('success', false, 'error', 'produto nao encontrado');
  end if;

  select coalesce(sum(qty), 0) into _reservado
    from public.estoque_reservas
   where product_id = _product_id and coalesce(owner_id, '') = coalesce(_owner_id, '')
     and status = 'ativa' and expira_em > now();

  _disponivel := _base - _reservado;

  if _disponivel < _qty then
    return jsonb_build_object('success', false, 'error', 'sem estoque disponivel', 'disponivel', _disponivel);
  end if;

  insert into public.estoque_reservas (product_id, owner_id, sale_id, qty, expira_em)
  values (_product_id, _owner_id, _sale_id, _qty, now() + make_interval(mins => _minutos_validade));

  return jsonb_build_object('success', true, 'disponivel_antes', _disponivel);
end;
$$;

revoke all on function public.reservar_estoque(text, text, text, numeric, int) from public, anon, authenticated;
grant execute on function public.reservar_estoque(text, text, text, numeric, int) to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- consumir_reserva — roda quando o pagamento confirma (dentro de
-- storeFulfill.js / pdvSettle.js). Não devolve peça nenhuma pro banco: quem
-- de fato desconta é a baixa da Fase 1 (baixar_estoque_central). Isso só
-- libera o "hold" — a reserva já cumpriu o papel dela.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.consumir_reserva(_sale_id text, _product_id text default null)
returns jsonb language sql security definer as $$
  with atualizadas as (
    update public.estoque_reservas
       set status = 'consumida'
     where sale_id = _sale_id and status = 'ativa'
       and (_product_id is null or product_id = _product_id)
    returning id
  )
  select jsonb_build_object('success', true, 'consumidas', count(*)) from atualizadas;
$$;

revoke all on function public.consumir_reserva(text, text) from public, anon, authenticated;
grant execute on function public.consumir_reserva(text, text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- devolver_reserva — cancelamento explícito (ex.: reservou mas a criação da
-- cobrança no Mercado Pago falhou logo depois — não pode ficar segurando a
-- peça por um checkout que nunca vai virar venda). Reusa o status
-- 'expirada': pro cálculo de disponível dá exatamente no mesmo — não conta
-- mais como reserva ativa.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.devolver_reserva(_sale_id text, _product_id text default null)
returns jsonb language sql security definer as $$
  with atualizadas as (
    update public.estoque_reservas
       set status = 'expirada'
     where sale_id = _sale_id and status = 'ativa'
       and (_product_id is null or product_id = _product_id)
    returning id
  )
  select jsonb_build_object('success', true, 'devolvidas', count(*)) from atualizadas;
$$;

revoke all on function public.devolver_reserva(text, text) from public, anon, authenticated;
grant execute on function public.devolver_reserva(text, text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- expirar_reservas_estoque — cron 1x/min (mesmo padrão do
-- finalizeExpiredAuctions, que já roda nessa cadência). Devolve em lote toda
-- reserva vencida que ninguém pagou.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.expirar_reservas_estoque()
returns jsonb language sql security definer as $$
  with expiradas as (
    update public.estoque_reservas
       set status = 'expirada'
     where status = 'ativa' and expira_em <= now()
    returning id
  )
  select jsonb_build_object('success', true, 'expiradas', count(*)) from expiradas;
$$;

revoke all on function public.expirar_reservas_estoque() from public, anon, authenticated;
grant execute on function public.expirar_reservas_estoque() to service_role;
