-- 📣 A LISTA DE QUEM PEDIU PARA NÃO RECEBER MAIS — 11/09/2026
--
-- ══════════════════════════════════════════════════════════════════════════════
-- POR QUE ISTO PRECISA EXISTIR ANTES DO PRIMEIRO DISPARO
-- ══════════════════════════════════════════════════════════════════════════════
-- Varremos o information_schema inteiro em 11/09: NENHUMA tabela do banco tem
-- coluna de consentimento, opt-in, opt-out ou descadastro. Nenhuma.
--
-- Isso quer dizer que hoje, se um cliente clicar em "não quero mais receber",
-- não existe lugar no banco para gravar essa vontade. O Brevo guarda a supressão
-- no lado dele, mas o nosso próximo disparo — que monta a lista a partir DAQUI —
-- não sabe de nada e remanda para a mesma pessoa.
--
-- Campanha que remanda para quem pediu para sair não é chateação: é o caminho
-- mais rápido para o botão "marcar como spam", e é ele que derruba a entrega de
-- TODO e-mail do domínio, incluindo o código de login.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- COMO É USADA
-- ══════════════════════════════════════════════════════════════════════════════
-- • `api/functions/descadastrar.js` grava aqui quando a pessoa clica no link do
--   rodapé do e-mail (ou responde SAIR no SMS).
-- • `scripts/campanha/listar.mjs` lê esta tabela e corta esses contatos da lista
--   ANTES de qualquer envio.
create table if not exists public.marketing_descadastro (
  id          uuid primary key default gen_random_uuid(),
  email       text,
  telefone    text,
  origem      text not null default 'link_email',   -- link_email | sms | manual | brevo
  motivo      text,
  created_at  timestamptz not null default now(),
  -- não adianta uma linha que não identifica ninguém
  constraint marketing_descadastro_tem_contato
    check (coalesce(email, telefone) is not null)
);

-- Uma linha por pessoa. Clicar duas vezes no link não cria duas linhas.
create unique index if not exists marketing_descadastro_email_unico
  on public.marketing_descadastro (lower(email)) where email is not null;
create unique index if not exists marketing_descadastro_telefone_unico
  on public.marketing_descadastro (telefone) where telefone is not null;

alter table public.marketing_descadastro enable row level security;

-- 🔴 Sem política nenhuma = ninguém lê e ninguém escreve pelo navegador.
-- A gravação acontece só pela função da Vercel, que usa a service role.
--
-- O REVOKE explícito é de propósito: a auditoria de 11/09 achou 125 tabelas em
-- que o papel `anon` tinha SELECT/INSERT/UPDATE/DELETE por herança de GRANT
-- antigo. Esta tabela guarda e-mail e telefone de quem pediu privacidade — é
-- justamente a que não pode nascer com esse GRANT.
revoke all on public.marketing_descadastro from anon;
revoke all on public.marketing_descadastro from authenticated;

comment on table public.marketing_descadastro is
  'Quem pediu para não receber campanha. Lida pelo scripts/campanha/listar.mjs antes de todo disparo.';
