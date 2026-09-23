-- 🤝 23/09/2026 — o card do quadro passa a saber QUEM é o cliente.
--
-- Pedido: "qualificar lead + Google Agenda pelo quadro". Qualificar exige um
-- cliente; até aqui o card (metodo_quadro) só tinha título, prazo, hora e
-- responsável — nenhum vínculo com `customers`. Sem isto "qualificar pelo
-- quadro" não tem em quem.
--
-- Mesmo par (id + nome) que responsavel_id/responsavel_nome já usam: o nome
-- vai junto pra tela não precisar de um JOIN pra desenhar o chip, e pra o
-- card continuar legível se o cadastro do cliente for apagado.
--
-- ⚠️ Aplicada em produção em 23/09/2026 03:28 UTC (versão 20260923032810) —
-- o esquema mora no banco, não na Vercel.
alter table public.metodo_quadro
  add column if not exists cliente_id text,
  add column if not exists cliente_nome text;
create index if not exists idx_metodo_quadro_cliente on public.metodo_quadro (cliente_id) where cliente_id is not null;
