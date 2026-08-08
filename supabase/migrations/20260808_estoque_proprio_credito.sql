-- ESTOQUE PRÓPRIO UNIFICADO + CRÉDITO DE ESTOQUE (08/08/2026)
--
-- Regra: quando o lojista compra estoque antecipado, a mercadoria entra no
-- estoque DELE (origem='comprado') e o valor pago volta como CRÉDITO DE ESTOQUE
-- (travado). A cada venda paga daquela peça, o custo destrava e cai no saldo
-- livre dele junto com a margem. A comissão da estrutura continua igual.

-- 1) de onde veio cada linha do estoque da loja + quanto ela custou
alter table if exists public.store_inventory
  add column if not exists origem text not null default 'central',
  add column if not exists custo_unitario numeric not null default 0,
  add column if not exists divida_aberta numeric not null default 0;

create index if not exists idx_store_inventory_owner_origem
  on public.store_inventory (owner_id, product_id, origem);

-- 2) carteira TRAVADA do lojista (não saca, não compra — só lastreia o estoque)
alter table if exists public.app_users
  add column if not exists credito_estoque numeric not null default 0;

-- 3) rastro de cada liberação (idempotência por venda + produto)
create table if not exists public.store_payouts (
  id text primary key,
  sale_id text not null,
  product_id text,
  product_title text,
  owner_id text not null,
  origem text not null default 'comprado',
  quantity numeric not null default 1,
  custo numeric not null default 0,      -- custo liberado do crédito de estoque
  comissao numeric not null default 0,   -- comissão da estrutura (proporcional)
  margem numeric not null default 0,     -- lucro do lojista
  divida_abatida numeric not null default 0,
  total_creditado numeric not null default 0,
  status text not null default 'pago',   -- pago | pending
  created_at timestamptz not null default now()
);

create unique index if not exists uq_store_payouts_sale_product
  on public.store_payouts (sale_id, product_id);
create index if not exists idx_store_payouts_owner
  on public.store_payouts (owner_id, created_at desc);