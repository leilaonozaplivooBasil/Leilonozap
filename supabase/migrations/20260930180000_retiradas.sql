-- 📦 RETIRADA DIGITAL — 30/09/2026
-- O comprovante de que a mercadoria foi retirada (escritório, ponto de
-- retirada, outro local), no lugar da folha assinada. Uma retirada por venda.
-- A assinatura fica aqui mesmo (PNG em base64, poucos KB); o termo é gravado
-- com a versão, pra trocar o texto depois não mudar o que cada um assinou.
-- Só o servidor lê e escreve (api/functions/retiradaNaLoja.js).
create table if not exists public.retiradas (
  id                 bigserial primary key,
  sale_id            text        not null unique,
  local              text        not null,
  local_outro        text,
  quem               text        not null check (quem in ('comprador','terceiro')),
  terceiro_nome      text,
  terceiro_doc4      text,
  com_codigo         boolean     not null,
  motivo_sem_codigo  text,
  assinatura         text        not null,
  foto_url           text,
  termo_versao       text        not null,
  termo_texto        text        not null,
  atendente_id       text        not null,
  atendente_nome     text,
  retirado_em        timestamptz not null default now()
);
create index if not exists retiradas_retirado_em_idx on public.retiradas (retirado_em desc);
alter table public.retiradas enable row level security;
revoke all on table public.retiradas from anon, authenticated;
