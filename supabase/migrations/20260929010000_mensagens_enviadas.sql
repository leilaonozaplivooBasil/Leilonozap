-- 📱 AVISOS POR WHATSAPP / SMS — 29/09/2026
-- Registro 1x por (pessoa, tipo, chave) — o "cobriram seu lance" repete no
-- máximo a cada 30 min (api/_lib/textosDasMensagens.js). Guarda por qual
-- canal saiu (whatsapp/sms), o id da Brevo e o erro, pra conferir entrega e
-- custo. Só o servidor lê e escreve.
create table if not exists public.mensagens_enviadas (
  id          bigserial primary key,
  user_id     text        not null,
  tipo        text        not null,
  chave       text        not null,
  canal       text,
  status      text        not null default 'reservado',
  message_id  text,
  erro        text,
  enviado_em  timestamptz not null default now(),
  unique (user_id, tipo, chave)
);
create index if not exists mensagens_enviadas_enviado_idx on public.mensagens_enviadas (enviado_em desc);
alter table public.mensagens_enviadas enable row level security;
revoke all on table public.mensagens_enviadas from anon, authenticated;
