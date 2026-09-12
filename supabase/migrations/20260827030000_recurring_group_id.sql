-- DIR-8 (27/08/2026) — gasto "Fixo Mensal" nunca gerava o lançamento do mês seguinte.
-- expense_type: 'fixo' e recurring_day sempre foram só campos salvos — nenhum código no
-- repositório lia esses dois campos pra criar o lançamento do próximo mês. Resultado real:
-- o Consórcio Nacional Volkswagen da Aline (vencimento 21/07/2026) ficou "vencido há 37
-- dia(s)" numa linha só, quando na verdade já são mais de um mês em aberto.
--
-- recurring_group_id agrupa todas as linhas da MESMA recorrência (o gasto original de julho
-- e os que o cron novo (api/functions/gerarGastosFixos.js) vai gerar pros meses seguintes).
-- Toda linha "fixo" já existente vira dona do próprio grupo (backfill abaixo) — a partir daí
-- o cron sabe, por grupo, qual foi o último mês já lançado.
alter table public.financial_expenses add column if not exists recurring_group_id text;

comment on column public.financial_expenses.recurring_group_id is
  'Agrupa as linhas da mesma recorrência (gasto "fixo"). Aponta pro id do lançamento original do grupo — nele mesmo, inclusive (self-reference). NULL em gastos não-fixos. Ver api/functions/gerarGastosFixos.js.';

update public.financial_expenses
  set recurring_group_id = id
  where expense_type = 'fixo' and recurring_group_id is null;

create index if not exists idx_financial_expenses_recurring_group_id on public.financial_expenses(recurring_group_id);
