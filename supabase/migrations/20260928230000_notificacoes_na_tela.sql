-- 🔔 NOTIFICAÇÕES NA TELA (o sino do cliente) — 28/09/2026
-- Pedido do dono: "implementar o mesmo padrão dos e-mails para notificações na
-- tela do usuário. Principalmente 'alguém cobriu o lance, arrematou, pedido
-- enviado' e etc — sem perturbações como PIX gerado".
--
-- Uma linha por (pessoa, tipo, chave), gravada no MESMO ponto que dispara o
-- e-mail (api/_lib/avisosPorEmail.js → api/_lib/notificacoesNaTela.js).
-- "Superado" do mesmo leilão não empilha: a linha é atualizada (novo valor,
-- volta a ficar não lida). Só o servidor lê e escreve (service_role); o
-- navegador passa por api/functions/minhasNotificacoes.js, que exige crachá.
create table if not exists public.notificacoes (
  id         bigserial primary key,
  user_id    text        not null,
  tipo       text        not null,
  chave      text        not null,
  titulo     text        not null,
  texto      text        not null default '',
  link       text        not null default '',
  criada_em  timestamptz not null default now(),
  lida_em    timestamptz,
  unique (user_id, tipo, chave)
);
create index if not exists notificacoes_user_criada_idx on public.notificacoes (user_id, criada_em desc);
create index if not exists notificacoes_nao_lidas_idx on public.notificacoes (user_id) where lida_em is null;
alter table public.notificacoes enable row level security;
revoke all on table public.notificacoes from anon, authenticated;
