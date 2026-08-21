-- Migração/expurgo Base44 — memória das conversas do WhatsApp (Zeca e Heloim).
--
-- A Edge Function whatsapp-webhook é stateless por natureza (cada webhook é uma invocação
-- nova) — sem isto, cada mensagem chegaria na Claude sem nenhum contexto do que já foi
-- dito, e os dois agentes pareceriam ter Alzheimer a cada resposta. Guarda por remote_jid
-- (o número normalizado do WhatsApp), não por usuário — não depende de o cliente já
-- existir em app_users pra ter conversa com o Zeca.
create table if not exists public.ai_conversas (
  id          bigserial primary key,
  remote_jid  text not null,
  agente      text not null check (agente in ('zeca', 'heloim')),
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists ai_conversas_jid_idx
  on public.ai_conversas (remote_jid, created_at desc);

comment on table public.ai_conversas is
  'Expurgo Base44 (21/08/2026): historico de mensagens dos agentes de WhatsApp (Zeca/Heloim), usado como memoria de curto prazo pela Edge Function whatsapp-webhook.';
