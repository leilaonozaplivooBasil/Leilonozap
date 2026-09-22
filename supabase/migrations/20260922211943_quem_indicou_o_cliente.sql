-- ✅ JÁ APLICADA EM PRODUÇÃO em 22/09/2026, ANTES do merge — coluna nova vive
-- no banco e não sobe pela Vercel. Na ordem inversa, a tela gravaria num campo
-- que o servidor ainda não tem.
-- ⚠️ O NÚMERO DESTE ARQUIVO É O QUE O BANCO REGISTROU (conferido em
-- supabase_migrations.schema_migrations). Arquivo e registro 1:1 é o que a
-- PR #334 consertou; deixar diferente recria o problema de 15/09.

-- 🤝 QUEM INDICOU O CLIENTE — 22/09/2026
--
-- Pedido do Ávilla: "no forms de novo cliente deve ter a opção de marcar quem
-- indicou o cliente e quem é o executivo responsável pelo cliente."
--
-- O EXECUTIVO já existia: é `assigned_seller`, que o formulário já grava. Só
-- quem indicou não tinha onde morar.
--
-- Duas colunas, como o resto da base faz (responsavel_id/responsavel_nome em
-- captacao_oportunidades): o id pra ligar, o nome pra a lista não precisar de
-- um join só pra escrever uma linha — e pra a indicação sobreviver caso a
-- conta de quem indicou seja apagada um dia.
--
-- Anuláveis e sem default: os 277 cadastros que já existem continuam válidos.
alter table public.customers
  add column if not exists indicado_por_id text,
  add column if not exists indicado_por_nome text;

comment on column public.customers.indicado_por_id is
  'app_users.id de quem indicou este cliente. Opcional.';
comment on column public.customers.indicado_por_nome is
  'Nome de quem indicou, guardado junto para a lista não depender de join.';
