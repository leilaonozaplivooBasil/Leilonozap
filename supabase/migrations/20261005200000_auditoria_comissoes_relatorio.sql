-- 🧾 DIR-200 (05/10/2026) — AUDITORIA FINANCEIRA DAS COMISSÕES
--
-- Dono: "auditoria extremamente diligente; atualize os pagamentos após os 7
-- dias; relatório destrinchando os 10% dos depósitos, os 5% do leilão e a venda
-- da loja por licença; traga erros e bugs."
--
-- Achados que esta migração corrige (ver docs/AUDITORIA_COMISSOES_2026-10-05.md):
--   4.3 liberar_saldos_maturados liberava a comissão vencida sem olhar se o
--       depósito continuava pago e sem contestação no gateway;
--   4.4 estornar_comissoes_do_deposito tirava do saldo mas deixava a linha
--       "Gerada" em commission_records (dava para pagar na mão de novo).
-- E cria relatorio_comissoes(): a visão por origem (depósito 10% · leilão 5%/10%
-- · loja por cargo) e a auditoria viva "saldo × extrato", só para o servidor.

-- ── 1) liberação dos 7 dias, agora com segurança ────────────────────────────
-- Depósito que não está mais pago, ou que o gateway devolveu/contestou:
-- a linha vira 'cancelado' sem creditar ninguém.
-- Depósito retido / em disputa / alterado e ainda não tratado na conciliação:
-- fica em espera (não libera nem cancela) até alguém tratar.
create or replace function public.liberar_saldos_maturados()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare _n int := 0;
begin
  -- 0) dinheiro que saiu não vira comissão
  update public.commission_ledger l set status = 'cancelado', released_at = now()
    from public.catalog_sales cs
   where cs.id = l.sale_id
     and l.status = 'a_liberar' and l.role_in_sale = 'indicacao_deposito'
     and l.release_at is not null and l.release_at <= now()
     and (lower(coalesce(cs.status, '')) not in ('paid', 'pago', 'entregue', 'confirmado', 'concluido')
          or coalesce(cs.gateway->>'situacao', '') in ('devolvido', 'devolvido_parcial', 'chargeback'));

  -- 1) libera só o que venceu E está de pé
  with matured as (
    update public.commission_ledger l set status = 'disponivel', released_at = now()
      from public.catalog_sales cs
     where cs.id = l.sale_id
       and l.status = 'a_liberar'
       and l.role_in_sale = 'indicacao_deposito'
       and l.release_at is not null and l.release_at <= now()
       and lower(coalesce(cs.status, '')) in ('paid', 'pago', 'entregue', 'confirmado', 'concluido')
       and (coalesce(cs.gateway->>'situacao', 'liberado') not in ('retido', 'disputa', 'alterado', 'devolvido', 'devolvido_parcial', 'chargeback')
            or cs.conciliacao_resolvida_em is not null)
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

-- ── 2) estorno do depósito: a linha "Gerada" vira "Estornado" junto ─────────
create or replace function public.estornar_comissoes_do_deposito(_sale_id text, _motivo text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  _canceladas numeric := 0; _estornadas numeric := 0; _faltou numeric := 0; _n int := 0;
  _linhas numeric := 0; _ja_pagas numeric := 0;
begin
  -- 1) ainda presas (a_liberar): cancelam, nada chegou a ninguém
  with c as (
    update public.commission_ledger set status = 'cancelado', released_at = now()
     where sale_id = _sale_id and status = 'a_liberar' returning amount
  ) select coalesce(sum(amount), 0), count(*) into _canceladas, _n from c;
  -- 2) já liberadas (disponivel): estornam e saem do saldo de comissão (nunca negativo; o que faltar fica no retorno)
  with liberadas as (
    update public.commission_ledger set status = 'estornado', released_at = now()
     where sale_id = _sale_id and status = 'disponivel' returning beneficiary_id, amount
  ), agg as (select beneficiary_id, sum(amount) amt from liberadas group by beneficiary_id),
  antes as (select a.beneficiary_id, a.amt, coalesce(u.commission_balance, 0) saldo from agg a join public.app_users u on u.id = a.beneficiary_id),
  aplicado as (
    update public.app_users u set commission_balance = round(greatest(0, an.saldo - an.amt), 2)
      from antes an where u.id = an.beneficiary_id returning an.amt pedido, greatest(0, an.amt - an.saldo) faltou
  ) select coalesce(sum(pedido), 0), coalesce(sum(faltou), 0) into _estornadas, _faltou from aplicado;
  -- 3) a linha da tela acompanha: "Gerada" vira "Estornado" (DIR-200, achado 4.4)
  with rev as (
    update public.commission_records set status = 'reversed'
     where sale_id = _sale_id and role = 'indicacao_deposito' and status = 'confirmed' returning amount
  ) select coalesce(sum(amount), 0) into _linhas from rev;
  -- linha já paga na mão não tem como voltar sozinha: fica no retorno para cobrança
  select coalesce(sum(amount), 0) into _ja_pagas
    from public.commission_records where sale_id = _sale_id and role = 'indicacao_deposito' and status = 'paid';
  return jsonb_build_object('success', true, 'sale_id', _sale_id, 'motivo', _motivo,
    'canceladas', round(_canceladas, 2), 'estornadas', round(_estornadas, 2), 'nao_recuperado', round(_faltou, 2),
    'linhas_estornadas', round(_linhas, 2), 'ja_pagas', round(_ja_pagas, 2));
end;
$$;
revoke execute on function public.estornar_comissoes_do_deposito(text, text) from public, anon, authenticated;

-- ── 3) o relatório: por origem, por licença, empresa à parte, auditoria viva ─
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
  'em_espera_vencidas', (select count(*) from led where led.status = 'a_liberar' and led.release_at <= now() - interval '2 hours')
);
$$;
revoke execute on function public.relatorio_comissoes() from public, anon, authenticated;
