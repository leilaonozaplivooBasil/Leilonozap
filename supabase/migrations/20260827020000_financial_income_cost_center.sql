-- Financeiro Fase 2 (DIR-7) — livro-razão de receita + centro de custo.
--
-- financial_expenses só registra SAÍDA de dinheiro. Não existia nenhum jeito de ver
-- ENTRADA (venda, taxa) dentro do módulo Financeiro. Esta migration cria o livro-razão
-- de receita, gravado no MOMENTO em que a receita é confirmada (nunca recalculado ao
-- vivo) — mesma decisão de auditabilidade contábil já registrada em docs/DIRETIVA_ATUAL.md
-- (DIR-6/DIR-7): um número que a Aline usa não pode mudar sozinho depois.
--
-- Regra de reconhecimento de receita (decidida com o dono, ver DIR-7):
--   ENTRA:  comissão de venda liquidada (Loja/Leilão) — só a comissão, não o valor
--           cheio da venda, porque o resto é repassado a um vendedor terceiro; e taxas
--           puras sem repasse (adesão de vendedor, plano parceiro) — valor cheio.
--   NÃO ENTRA: depósito de saldo/carteira/operação (é só crédito interno — vira receita
--           depois, já contado como comissão quando o cliente gastar de verdade; contar
--           os dois seria contar o mesmo dinheiro duas vezes); frete de vendedor (repasse
--           à Melhor Envio); reposição de estoque (paga com saldo que ou já foi contado
--           na origem do depósito, ou não gera repasse a terceiro).
create table if not exists public.financial_income (
  id            text primary key default gen_random_uuid()::text
  , description text not null
  , category    text not null
  , cost_center text
  , amount      numeric not null
  , source      text not null
  , sale_id     text
  , notes       text
  , received_date date not null default current_date
  , created_by    text
  , created_by_id  text
  , created_at   timestamptz not null default now()
  , updated_at   timestamptz not null default now()
);

comment on table public.financial_income is
  'Livro-razão de receita real (DIR-7, Fase 2 do Financeiro). Uma linha por evento de receita já confirmado (comissão de venda liquidada, taxa de adesão/plano) — gravada no momento da confirmação, nunca recalculada. Ver regra de reconhecimento no comentário no topo desta migration.';
comment on column public.financial_income.source is
  'Origem da receita: ''venda'' (comissão de Loja/Leilão) ou ''taxa'' (adesão/plano, sem repasse a terceiro).';
comment on column public.financial_income.sale_id is
  'catalog_sales.id de origem, quando source = ''venda''. Sem FK (mesmo padrão de financial_expenses/reserva_ledger) — é referência de auditoria, não integridade referencial.';
comment on column public.financial_income.cost_center is
  'Unidade de negócio dona da receita (ex.: Leilões, Loja Virtual, Operacional) — mesma dimensão nova adicionada a financial_expenses nesta migration. Ver src/lib/costCenters.js.';

create index if not exists idx_financial_income_sale_id on public.financial_income(sale_id);
create index if not exists idx_financial_income_received_date on public.financial_income(received_date);

alter table public.financial_income enable row level security;

drop trigger if exists trg_financial_income_updated_at on public.financial_income;
create trigger trg_financial_income_updated_at before update on public.financial_income
  for each row execute function public.set_updated_at();

-- Centro de custo é a MESMA dimensão nos dois lados do livro (receita e despesa) — sem
-- ela, "gasto de Melhor Envio" não dá pra separar entre Loja e Leilões.
alter table public.financial_expenses add column if not exists cost_center text;
comment on column public.financial_expenses.cost_center is
  'Unidade de negócio dona do gasto (ex.: Leilões, Loja Virtual, Operacional). Ver src/lib/costCenters.js. Campo opcional — gastos antigos ficam sem valor, sem backfill retroativo.';
