-- ══════════════════════════════════════════════════════════════════════════
-- SALDO A LIBERAR (escrow do vendedor) — Leilão NoZap — 16/07/2026
--
-- Regra (definida pelo Diogo): TODA venda com vendedor vira uma linha "venda"
-- no extrato dele, com o VALOR TOTAL, no estado A LIBERAR. Ela NÃO entra no
-- saldo sacável na hora — só vira sacável quando:
--   (a) o comprador confirma o recebimento, OU
--   (b) passa o prazo:  PIX/dinheiro/nexus = 7 dias · cartão = 14 dias.
-- Segurança: a linha "a_liberar" NUNCA toca commission_balance; o dinheiro só
-- entra no saldo sacável no momento da liberação. Sem risco de pagar adiantado.
-- ══════════════════════════════════════════════════════════════════════════

-- 1) Estado no extrato (commission_ledger). Linhas antigas ficam 'disponivel'
--    (já estavam creditadas), só as novas 'venda' nascem 'a_liberar'.
alter table public.commission_ledger
  add column if not exists status      text        not null default 'disponivel',
  add column if not exists release_at  timestamptz,
  add column if not exists released_at timestamptz;

create index if not exists idx_ledger_hold
  on public.commission_ledger (status, release_at) where status = 'a_liberar';

-- uma única linha "venda" por (venda, vendedor) — idempotência
create unique index if not exists uq_ledger_venda
  on public.commission_ledger (sale_id, beneficiary_id)
  where role_in_sale = 'venda';

-- 2) Prazo de liberação por método de pagamento (dias)
create or replace function public._hold_days(_method text)
returns int language sql immutable as $$
  select case
    when coalesce(_method,'') ilike '%stripe%'
      or coalesce(_method,'') ilike 'card%'
      or coalesce(_method,'') ilike '%cart%' then 14
    else 7
  end;
$$;

-- 3) Trigger: venda paga/entregue → linha "venda" A LIBERAR no extrato do vendedor.
create or replace function public.trg_sale_to_ledger()
returns trigger language plpgsql security definer as $$
declare _name text; _level text; _amount numeric;
begin
  if new.seller_id is null or coalesce(new.total_amount,0) <= 0 then return new; end if;
  if new.status not in ('paid','entregue','enviado','confirmado','pago','concluido') then return new; end if;

  _amount := round(new.total_amount::numeric, 2);   -- VALOR TOTAL da venda
  select full_name, primary_career_level into _name, _level from public.app_users where id = new.seller_id;

  insert into public.commission_ledger
    (sale_id, beneficiary_id, beneficiary_name, beneficiary_level, role_in_sale, pct, amount, status, release_at)
  values
    (new.id, new.seller_id, _name, _level, 'venda', 100, _amount, 'a_liberar',
     now() + (public._hold_days(new.payment_method) || ' days')::interval)
  on conflict (sale_id, beneficiary_id) where role_in_sale = 'venda' do nothing;

  return new;
end;
$$;

drop trigger if exists sale_to_ledger on public.catalog_sales;
create trigger sale_to_ledger
  after insert or update of status on public.catalog_sales
  for each row execute function public.trg_sale_to_ledger();

-- 4) Liberação por prazo (roda no pg_cron). Move a_liberar→disponivel e SÓ AGORA
--    soma no commission_balance (saldo sacável).
create or replace function public.liberar_saldos_maturados()
returns int language plpgsql security definer as $$
declare _n int;
begin
  with matured as (
    update public.commission_ledger l set status='disponivel', released_at=now()
      where l.status='a_liberar' and l.release_at is not null and l.release_at <= now()
      returning l.beneficiary_id, l.amount
  ), agg as (select beneficiary_id, sum(amount) amt from matured group by beneficiary_id)
  update public.app_users u
     set commission_balance = round(coalesce(u.commission_balance,0) + a.amt, 2)
    from agg a where u.id = a.beneficiary_id;
  get diagnostics _n = row_count; return _n;
end;
$$;

-- 5) Liberação ANTECIPADA quando o comprador confirma o recebimento.
create or replace function public.confirmar_recebimento(_sale_id text)
returns int language plpgsql security definer as $$
declare _n int;
begin
  with rel as (
    update public.commission_ledger l set status='disponivel', released_at=now()
      where l.sale_id=_sale_id and l.status='a_liberar' and l.role_in_sale='venda'
      returning l.beneficiary_id, l.amount
  ), agg as (select beneficiary_id, sum(amount) amt from rel group by beneficiary_id)
  update public.app_users u
     set commission_balance = round(coalesce(u.commission_balance,0) + a.amt, 2)
    from agg a where u.id = a.beneficiary_id;
  get diagnostics _n = row_count;
  update public.catalog_sales set status='entregue' where id=_sale_id and status <> 'entregue';
  return _n;
end;
$$;
revoke all on function public.confirmar_recebimento(text) from public, anon, authenticated;
grant execute on function public.confirmar_recebimento(text) to service_role;

-- 6) BACKFILL: vendas já pagas/entregues que NÃO computaram no extrato ganham
--    a linha "venda" a_liberar agora (sem tocar saldo sacável).
insert into public.commission_ledger
  (sale_id, beneficiary_id, beneficiary_name, beneficiary_level, role_in_sale, pct, amount, status, release_at)
select s.id, s.seller_id, u.full_name, u.primary_career_level, 'venda', 100,
       round(s.total_amount::numeric,2), 'a_liberar',
       s.created_at + (public._hold_days(s.payment_method) || ' days')::interval
from public.catalog_sales s join public.app_users u on u.id = s.seller_id
where s.seller_id is not null and coalesce(s.total_amount,0) > 0
  and s.status in ('paid','entregue','enviado','confirmado','pago','concluido')
  and not exists (select 1 from public.commission_ledger l
                  where l.sale_id=s.id and l.beneficiary_id=s.seller_id and l.role_in_sale='venda')
on conflict (sale_id, beneficiary_id) where role_in_sale = 'venda' do nothing;
