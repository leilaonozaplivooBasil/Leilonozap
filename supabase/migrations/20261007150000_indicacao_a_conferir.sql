-- 🧾 DIR-203 (07/10/2026) — A INDICAÇÃO DE DEPÓSITO QUE MUDOU DE DONO APARECE NO RELATÓRIO
--
-- Dono: "veja se quem indicou está ganhando os 10% no depósito". Caso real:
-- Marcelo Zaidan foi movido para debaixo do Luciano em 03/10 (ajuste de rede
-- pelo admin), mas os R$ 4.450 que ele depositou entre 29/09 e 02/10 pagaram o
-- indicador da época (a conta oficial) — e o Luciano não via nada.
--
-- A regra continua: o indicador é o da hora do depósito. O que muda é que o
-- relatório passa a listar todo depósito na regra cujo indicador ATUAL do
-- cliente não recebeu a comissão daquele depósito ("indicacoes_a_conferir"),
-- para a Beatriz ver e o dono decidir caso a caso — nunca mais calado.
create or replace function public.relatorio_comissoes()
returns jsonb language sql security definer stable set search_path to 'public' as $$
with emp as (
  select id from public.app_users where referral_code = 'leilaonozap' or full_name = 'Leilão NoZap - Site Oficial'
), r as (
  select r.user_id, r.user_name, r.role, r.status, r.amount, r.created_at,
         case when r.role = 'indicacao_deposito' then 'deposito'
              when r.role like 'leilao\_%' then 'leilao'
              else 'loja' end as origem,
         (r.user_id in (select id from emp)) as da_empresa
    from public.commission_records r
), led as (
  select l.beneficiary_id, l.beneficiary_name, l.amount, l.release_at, l.status,
         (l.beneficiary_id in (select id from emp)) as da_empresa
    from public.commission_ledger l
   where l.role_in_sale = 'indicacao_deposito'
), origens as (
  select o.origem, o.ord,
    coalesce((select round(sum(amount), 2) from led where led.status = 'a_liberar' and o.origem = 'deposito' and not led.da_empresa), 0) as em_espera,
    (select count(*) from led where led.status = 'a_liberar' and o.origem = 'deposito' and not led.da_empresa) as n_em_espera,
    coalesce((select round(sum(amount), 2) from r where r.origem = o.origem and r.status = 'confirmed' and not r.da_empresa), 0) as a_receber,
    (select count(*) from r where r.origem = o.origem and r.status = 'confirmed' and not r.da_empresa) as n_a_receber,
    coalesce((select round(sum(amount), 2) from r where r.origem = o.origem and r.status = 'paid' and not r.da_empresa), 0) as pago,
    (select count(*) from r where r.origem = o.origem and r.status = 'paid' and not r.da_empresa) as n_pago,
    coalesce((select round(sum(amount), 2) from r where r.origem = o.origem and r.status = 'reversed' and not r.da_empresa), 0) as estornado,
    coalesce((select round(sum(amount), 2) from led where led.status in ('cancelado', 'estornado') and o.origem = 'deposito' and not led.da_empresa), 0) as cancelado_em_espera,
    coalesce((select round(sum(amount), 2) from r where r.origem = o.origem and r.status in ('confirmed', 'paid') and r.da_empresa), 0) as empresa,
    (select count(distinct user_id) from r where r.origem = o.origem and r.status in ('confirmed', 'paid') and not r.da_empresa) as pessoas
  from (values ('deposito', 1), ('leilao', 2), ('loja', 3)) as o(origem, ord)
), licencas as (
  select r.role, r.origem,
    count(distinct r.user_id) filter (where r.status in ('confirmed', 'paid')) as pessoas,
    coalesce(round(sum(r.amount) filter (where r.status = 'confirmed'), 2), 0) as a_receber,
    coalesce(round(sum(r.amount) filter (where r.status = 'paid'), 2), 0) as pago,
    coalesce(round(sum(r.amount) filter (where r.status = 'reversed'), 2), 0) as estornado,
    count(*) as linhas
  from r where not r.da_empresa group by r.role, r.origem
), saldos as (
  select u.id, u.full_name, round(coalesce(u.commission_balance, 0), 2) as saldo,
         coalesce((select round(sum(amount), 2) from r where r.user_id = u.id and r.status = 'confirmed'), 0) as extrato
    from public.app_users u
   where u.id not in (select id from emp)
     and (coalesce(u.commission_balance, 0) <> 0 or exists (select 1 from r where r.user_id = u.id and r.status = 'confirmed'))
), a_conferir as (
  -- depósito na regra cujo indicador ATUAL (pessoa real, ativa) não recebeu a comissão deste depósito
  select cs.id as sale_id, cs.created_at as depositado_em, cs.total_amount, cs.buyer_name,
         ref.id as indicador_id, ref.full_name as indicador,
         (select string_agg(l.beneficiary_name || ' (' || l.status || ')', ', ') from public.commission_ledger l where l.sale_id = cs.id and l.role_in_sale = 'indicacao_deposito') as quem_recebeu
    from public.catalog_sales cs
    join public.app_users b on b.id = cs.buyer_id
    join public.app_users ref on ref.id = b.referred_by_id
   where cs.kind = 'wallet_deposit' and lower(coalesce(cs.status, '')) = 'paid'
     and coalesce(cs.created_date, cs.created_at) >= public._indicacao_deposito_inicio()
     and ref.id not in (select id from emp) and ref.id <> b.id and ref.active is not false
     and not exists (select 1 from public.commission_ledger l where l.sale_id = cs.id and l.role_in_sale = 'indicacao_deposito' and l.beneficiary_id = ref.id)
)
select jsonb_build_object(
  'gerado_em', now(),
  'origens', (select jsonb_agg(to_jsonb(o) - 'ord' order by o.ord) from origens o),
  'licencas', (select coalesce(jsonb_agg(to_jsonb(l) order by l.a_receber desc, l.pago desc), '[]'::jsonb) from licencas l),
  'empresa', jsonb_build_object(
     'saldo', (select round(coalesce(commission_balance, 0), 2) from public.app_users where id in (select id from emp) order by created_at limit 1),
     'leilao_retido', coalesce((select round(sum(amount), 2) from r where r.role = 'leilao_retido' and r.status in ('confirmed', 'paid')), 0),
     'loja_sem_dono', coalesce((select round(sum(amount), 2) from r where r.origem = 'loja' and r.da_empresa and r.status in ('confirmed', 'paid')), 0),
     'indicacao_deposito', coalesce((select round(sum(amount), 2) from r where r.origem = 'deposito' and r.da_empresa and r.status in ('confirmed', 'paid')), 0),
     'indicacao_em_espera', coalesce((select round(sum(amount), 2) from led where led.status = 'a_liberar' and led.da_empresa), 0)
  ),
  'pessoas', jsonb_build_object(
     'saldo_total', coalesce((select round(sum(saldo), 2) from saldos), 0),
     'com_saldo', (select count(*) from saldos where saldo > 0),
     'extrato_total', coalesce((select round(sum(extrato), 2) from saldos), 0)
  ),
  'saldos_fora_do_extrato', (select coalesce(jsonb_agg(jsonb_build_object('user_id', s.id, 'nome', s.full_name, 'saldo', s.saldo, 'extrato', s.extrato, 'diferenca', round(s.saldo - s.extrato, 2)) order by abs(s.saldo - s.extrato) desc), '[]'::jsonb)
                                from saldos s where abs(s.saldo - s.extrato) >= 0.05),
  'proximas_liberacoes', (select coalesce(jsonb_agg(jsonb_build_object('nome', x.beneficiary_name, 'valor', x.amount, 'libera_em', x.release_at) order by x.release_at), '[]'::jsonb)
                            from (select * from led where led.status = 'a_liberar' order by release_at limit 20) x),
  'em_espera_vencidas', (select count(*) from led where led.status = 'a_liberar' and led.release_at <= now() - interval '2 hours'),
  'indicacoes_a_conferir', (select coalesce(jsonb_agg(jsonb_build_object('sale_id', a.sale_id, 'depositado_em', a.depositado_em, 'valor', a.total_amount, 'cliente', a.buyer_name, 'indicador', a.indicador, 'indicador_id', a.indicador_id, 'quem_recebeu', a.quem_recebeu, 'dez_pct', round(a.total_amount * 0.10, 2)) order by a.depositado_em desc), '[]'::jsonb)
                              from a_conferir a)
);
$$;
revoke execute on function public.relatorio_comissoes() from public, anon, authenticated;

-- ── ROTEIRO DO PASSADO (feito à parte) ───────────────────────────────────────
-- 4 linhas 'a_liberar' para o Luciano sobre os depósitos do Marcelo (R$ 445),
-- com o mesmo prazo de 7 dias contado do depósito. As linhas da conta oficial
-- já estavam canceladas (DIR-201).
