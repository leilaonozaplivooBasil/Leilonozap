-- DIR-11 (28/08/2026) — backfill de financial_income com o histórico real.
--
-- financial_income (DIR-7) nasceu vazia de propósito, gravando só daqui pra
-- frente — mas o dono pediu pra "puxar tudo dado real", e catalog_sales já
-- tem meses de venda paga de verdade, com commission_total já calculado.
-- Sem backfill, o Financeiro/CRM mostravam R$ 0,00 de receita mesmo com o
-- negócio rodando há tempo — não porque não tinha receita, porque o livro-
-- razão só começou a existir agora.
--
-- MESMA REGRA já usada no código ao vivo (api/functions/mpWebhook.js,
-- api/functions/settleAuctionWithBalance.js, api/_lib/pdvSettle.js —
-- ver registrarReceita em api/_lib/financialIncome.js), pra não haver
-- divergência entre o que foi backfilled e o que passa a ser gravado a
-- partir de agora:
--   ENTRA:  comissão de venda liquidada (commission_total, não o valor
--           cheio) e taxa sem repasse a terceiro (adesão/plano — valor
--           cheio, a empresa fica com 100%).
--   NÃO ENTRA: depósito de saldo/carteira/operação, passaporte, frete de
--           vendedor, reposição de estoque — mesmos motivos já documentados
--           no comentário de topo de financialIncome.js.
--
-- Idempotente: NOT EXISTS por sale_id garante que rodar esta migration mais
-- de uma vez (ou coexistir com o hook ao vivo, se algo já tiver sido pago
-- entre o merge da DIR-7 e este backfill) nunca duplica uma linha.

-- 1) Vendas liquidadas (Loja Virtual, arremate, PDV, qualquer kind não
--    listado como depósito/repasse) — só a COMISSÃO, nunca o valor cheio.
insert into public.financial_income (description, category, cost_center, amount, source, sale_id, received_date)
select
  'Comissão — ' || case when s.kind = 'arremate' then 'arremate' else 'venda' end || ' #' || s.id,
  case when s.kind = 'arremate' then 'comissao_leilao' else 'comissao_loja' end,
  case when s.kind = 'arremate' then 'Leilões' else 'Loja Virtual' end,
  s.commission_total,
  'venda',
  s.id,
  coalesce(s.created_date::date, current_date)
from public.catalog_sales s
where s.commission_total is not null and s.commission_total > 0
  and coalesce(s.kind, '') not in (
    'reposicao', 'wallet_deposit', 'commission_deposit', 'operacao_deposit',
    'passaporte', 'seller_freight', 'adesao', 'seller_adhesion', 'partner_plan'
  )
  and not exists (select 1 from public.financial_income fi where fi.sale_id = s.id);

-- 2) Taxas sem repasse a terceiro (adesão de vendedor, plano parceiro,
--    adesão comum) — valor CHEIO, porque a empresa fica com 100%.
insert into public.financial_income (description, category, cost_center, amount, source, sale_id, received_date)
select
  case s.kind
    when 'adesao' then 'Adesão — ' || coalesce(s.buyer_name, s.id)
    when 'seller_adhesion' then 'Adesão de vendedor — ' || coalesce(s.buyer_name, s.id)
    when 'partner_plan' then 'Plano parceiro — ' || coalesce(s.buyer_name, s.id)
  end,
  case s.kind
    when 'adesao' then 'taxa_adesao'
    when 'seller_adhesion' then 'taxa_adesao_vendedor'
    when 'partner_plan' then 'plano_parceiro'
  end,
  'Operacional',
  s.total_amount,
  'taxa',
  s.id,
  coalesce(s.created_date::date, current_date)
from public.catalog_sales s
where s.kind in ('adesao', 'seller_adhesion', 'partner_plan')
  and s.total_amount is not null and s.total_amount > 0
  and s.status not in ('pending_payment', 'canceled', 'cancelado', 'cancelled')
  and not exists (select 1 from public.financial_income fi where fi.sale_id = s.id);
