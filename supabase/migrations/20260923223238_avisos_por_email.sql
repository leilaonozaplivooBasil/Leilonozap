-- ✉️ AVISOS POR E-MAIL — 23/09/2026
-- Os 8 gatilhos pedidos pelo dono (cadastro, entrou no leilão, superado,
-- arrematou, última hora, depósito, compra confirmada/enviada, KYC/saque).
-- Aqui só o que é banco: preferências (LGPD — a pessoa desliga pelo link do
-- rodapé, sem login) e o registro 1x por (pessoa, tipo, chave) que segura a
-- repetição ("superado" repete no máximo a cada 10 min).
-- Regras e textos: api/_lib/regrasDosAvisos.js e api/_lib/textosDosAvisos.js
alter table public.app_users add column if not exists avisos_leilao boolean not null default true;
alter table public.app_users add column if not exists avisos_conta boolean not null default true;

create table if not exists public.avisos_enviados (
  id          bigserial primary key,
  user_id     text        not null,
  tipo        text        not null,
  chave       text        not null,
  enviado_em  timestamptz not null default now(),
  unique (user_id, tipo, chave)
);
alter table public.avisos_enviados enable row level security;
revoke all on table public.avisos_enviados from anon, authenticated;
