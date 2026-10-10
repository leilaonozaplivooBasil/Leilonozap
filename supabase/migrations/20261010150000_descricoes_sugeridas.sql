-- 📝 10/10/2026 — RASCUNHOS DE DESCRIÇÃO (revisar descrições em lote).
--
-- Dono: "muitos produtos sem descrição ou com descrição fraca; um botão que coloque a descrição em
-- todos, um a um, devagarinho; sem falha." A IA escreve RASCUNHO aqui; nada vai para a vitrine até
-- o dono aprovar. Ao aprovar, a descrição anterior fica guardada nesta mesma linha (texto_anterior)
-- e dá para desfazer.
--
-- Só o servidor (service_role) lê e escreve: RLS ligada e nenhuma política.
create table if not exists public.descricoes_sugeridas (
  id              uuid primary key default gen_random_uuid(),
  alvo            text not null check (alvo in ('produto', 'leilao')),
  alvo_id         text not null,
  nome            text,
  texto_novo      text not null,
  texto_anterior  text,
  nivel_anterior  text,
  status          text not null default 'rascunho' check (status in ('rascunho', 'aprovada', 'rejeitada', 'desfeita')),
  fotos_usadas    integer not null default 0,
  criado_por      text,
  criado_em       timestamptz not null default now(),
  decidido_por    text,
  decidido_em     timestamptz
);

-- no máximo UM rascunho aberto por produto/leilão (gerar de novo substitui)
create unique index if not exists descricoes_sugeridas_um_rascunho
  on public.descricoes_sugeridas (alvo, alvo_id) where status = 'rascunho';
create index if not exists descricoes_sugeridas_status on public.descricoes_sugeridas (status, criado_em desc);

alter table public.descricoes_sugeridas enable row level security;
comment on table public.descricoes_sugeridas is 'Rascunhos de descrição gerados por IA; só vão para a vitrine quando o admin aprova. Acesso só pelo servidor.';
