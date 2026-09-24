-- 💸 PAGAMENTO MANUAL DE COMISSÃO — 24/09/2026 (pedido da Beatriz, autorizado pelo dono).
--
-- A tela "Pagamentos de Comissões" virou só-consulta em 23/09 porque o botão
-- antigo "marcar pago" nunca descontava o saldo real (commission_balance) —
-- pagar por fora deixava o valor intacto e sacável de novo depois: pagamento
-- em dobro (R$ 3.691,26 medidos em 24 pessoas).
--
-- Esta tabela é o REGISTRO de um jeito novo, que não tem esse furo: o débito
-- do saldo é ATÔMICO e acontece no MESMO PATCH que grava esta linha (ver
-- api/functions/payCommissionManually.js) — não existe "marcar pago" sem
-- "saldo saiu", os dois ou acontecem juntos ou nenhum acontece.
--
-- 🔒 DIFERENTE DO PADRÃO DO RESTO DO BANCO, DE PROPÓSITO: as outras tabelas
-- deste projeto têm policy authenticated_insert/update/delete com USING(true)
-- — o navegador nunca autentica de verdade (não usa Supabase Auth, é sempre
-- anon), então essas policies não fazem mal hoje, mas não são uma trava real.
-- Aqui eu NÃO copio esse padrão: só existe policy de LEITURA. A ÚNICA escrita
-- possível é pela função do servidor, com a chave de serviço (que ignora RLS
-- de qualquer forma) — não crio insert/update/delete pra não sugerir, pra
-- quem ler o schema depois, que existe uma porta que não deveria existir.
create table if not exists comissao_pagamentos_manuais (
  id text primary key,
  user_id text not null references app_users(id),
  user_name text,
  valor numeric not null check (valor > 0),
  saldo_antes numeric not null,
  saldo_depois numeric not null,
  pix_key_usada text,
  nota text,
  pago_por_id text not null,
  pago_por_nome text,
  created_at timestamptz not null default now()
);

create index if not exists idx_comissao_pagamentos_manuais_user
  on comissao_pagamentos_manuais (user_id, created_at desc);

alter table comissao_pagamentos_manuais enable row level security;

create policy public_read on comissao_pagamentos_manuais
  for select using (true);
