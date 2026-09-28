-- ✅ Pagar comissão por linha (28/09/2026, pedido da Beatriz).
-- O pagamento manual passa a guardar QUAIS linhas de commission_records ele
-- pagou. Coluna nova e nula: pagamento pelo valor livre (o de antes) segue igual.
-- A escrita é só do servidor (payCommissionManually, chave de serviço); a leitura
-- segue a RLS que a tabela já tem.
alter table public.comissao_pagamentos_manuais add column if not exists commission_ids text[];
comment on column public.comissao_pagamentos_manuais.commission_ids is
  'Linhas de commission_records pagas por este registro (null = pagamento por valor livre).';
