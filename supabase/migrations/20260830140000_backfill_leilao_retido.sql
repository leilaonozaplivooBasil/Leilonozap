-- DIR-14 (30/08/2026) — backfill da comissão de leilão retida pela empresa.
--
-- A fatia da rede que o leilão retém (25% do valor do arremate, quando falta
-- indicador; o que sobrar dos 30% quando tem indicador) é receita real, com
-- saldo sacável de verdade na conta oficial — decisão expressa do dono
-- (ver PONTO 100 em api/_lib/finalizeAuctionCore.js). Ela sempre foi
-- calculada e creditada corretamente em commission_records
-- (role='leilao_retido'), mas nunca tinha sido ligada a financial_income —
-- por isso "Faturamento Total" nunca refletia a receita real do leilão,
-- mesmo com leilões arrematados de verdade.
--
-- api/_lib/finalizeAuctionCore.js (reterFatiaDaRede) já foi corrigido pra
-- gravar em financial_income a partir de agora, no mesmo instante em que
-- credita a conta oficial. Esta migration só recupera o HISTÓRICO — os
-- leilões já arrematados antes da correção.
--
-- Idempotente: NOT EXISTS por (sale_id, category) garante que rodar de novo,
-- ou coexistir com o hook ao vivo pra leilões futuros, nunca duplica linha.
insert into public.financial_income (description, category, cost_center, amount, source, sale_id, received_date)
select
  'Comissão retida — leilão #' || cr.sale_id,
  'comissao_leilao',
  'Leilões',
  cr.amount,
  'venda',
  cr.sale_id,
  coalesce(cr.created_date::date, current_date)
from public.commission_records cr
where cr.sale_type = 'leilao'
  and cr.role = 'leilao_retido'
  and cr.amount is not null and cr.amount > 0
  and not exists (
    select 1 from public.financial_income fi
    where fi.sale_id = cr.sale_id and fi.category = 'comissao_leilao'
  );
