-- 🧾 GRUPO C (28/09/2026) — "pode ir, ninguém vende mercadoria própria" (dono).
--
-- O gatilho trg_sale_to_ledger lançava, a cada venda paga, 100% do valor da
-- venda no commission_ledger ('venda', 'a_liberar') em nome de quem registrou a
-- venda — escrow de marketplace. Aqui a mercadoria é sempre da empresa: quem
-- vende ganha a comissão dele em commission_records, e o valor da venda não é
-- de ninguém da equipe. Eram 479 lançamentos, R$ 71.812,19, que virariam saldo
-- SACÁVEL no primeiro disparo de liberar_saldos_maturados. Nunca foram liberados.
--
-- Ponto de restauração: backup.grupo_c_ledger_20260928 (status de cada linha)
-- e backup.grupo_c_funcao_20260928 (definição anterior da função + gatilho).

-- 1) risca (não apaga) os lançamentos de escrow ainda pendentes
update public.commission_ledger set status = 'cancelado'
 where role_in_sale = 'venda' and status = 'a_liberar';

-- 2) para de lançar escrow nas próximas vendas
alter table public.catalog_sales disable trigger sale_to_ledger;

-- 3) a liberação passa a liberar SÓ comissão de indicação de depósito — e cria,
--    para cada uma, a linha em commission_records que a tela de Pagamentos de
--    Comissões mostra ("Gerada"), para a Beatriz poder pagar por linha.
create or replace function public.liberar_saldos_maturados()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare _n int;
begin
  with matured as (
    update public.commission_ledger l set status = 'disponivel', released_at = now()
     where l.status = 'a_liberar'
       and l.role_in_sale = 'indicacao_deposito'
       and l.release_at is not null and l.release_at <= now()
    returning l.beneficiary_id, l.beneficiary_name, l.amount, l.pct, l.sale_id
  ), linhas as (
    insert into public.commission_records (user_id, user_name, amount, percent, role, sale_id, sale_type, sale_amount, product_title, status, created_date)
    select m.beneficiary_id, m.beneficiary_name, m.amount, m.pct, 'indicacao_deposito', m.sale_id, 'deposito', cs.total_amount,
           'Indicação de depósito — ' || coalesce(split_part(b.full_name, ' ', 1) || ' ' || left(split_part(b.full_name, ' ', 2), 1) || '.', 'cliente')
             || ' (' || to_char(coalesce(cs.created_date, cs.created_at) at time zone 'America/Sao_Paulo', 'DD/MM') || ')',
           'confirmed', now()
      from matured m
      left join public.catalog_sales cs on cs.id = m.sale_id
      left join public.app_users b on b.id = cs.buyer_id
    returning 1
  ), agg as (select beneficiary_id, sum(amount) amt from matured group by beneficiary_id)
  update public.app_users u
     set commission_balance = round(coalesce(u.commission_balance, 0) + a.amt, 2)
    from agg a where u.id = a.beneficiary_id;
  get diagnostics _n = row_count;
  return _n;
end;
$$;
revoke execute on function public.liberar_saldos_maturados() from public, anon, authenticated;

-- 4) agenda: de hora em hora (a comissão vence 7 dias depois do depósito, na hora exata)
select cron.unschedule(jobid) from cron.job where jobname = 'liberar-comissao-indicacao';
select cron.schedule('liberar-comissao-indicacao', '7 * * * *', 'select public.liberar_saldos_maturados();');

-- ── ROTEIRO DE VOLTA ─────────────────────────────────────────────────────────
-- select cron.unschedule(jobid) from cron.job where jobname = 'liberar-comissao-indicacao';
-- alter table public.catalog_sales enable trigger sale_to_ledger;
-- update public.commission_ledger l set status = b.status from backup.grupo_c_ledger_20260928 b where b.id = l.id;
-- (função anterior: backup.grupo_c_funcao_20260928.definicao)
