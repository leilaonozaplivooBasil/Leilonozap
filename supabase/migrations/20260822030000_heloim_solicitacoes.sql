-- Heloim volta a operar em grupo de WhatsApp (22/08/2026) — antes rodava só 1:1 com um único
-- admin. No Base44 antigo, "Heloim" era o recurso nativo de WhatsApp da plataforma: membros
-- de um grupo pediam alteração de sistema, o bot classificava o risco, registrava no Slack e
-- aguardava autorização do dono antes de considerar liberado. Não havia nenhuma tabela nem
-- código versionado disso (era tudo prompt livre do LLM da Base44, confirmado por pesquisa no
-- repositório) — esta tabela recria o registro que faltava, agora auditável de verdade.
create table if not exists public.heloim_solicitacoes (
  id                    bigserial primary key,
  grupo_id              text,               -- null quando veio de DM direta com um admin
  grupo_nome            text,
  solicitante_nome      text,
  solicitante_telefone  text not null,
  descricao             text not null,
  risco                 text not null check (risco in ('baixo', 'medio', 'alto')),
  pontos_atencao        text,
  status                text not null default 'pendente' check (status in ('pendente', 'aprovada', 'rejeitada')),
  decidido_por           text,
  decidido_em            timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists heloim_solicitacoes_status_idx
  on public.heloim_solicitacoes (status, created_at desc);

comment on table public.heloim_solicitacoes is
  'Pedidos de alteração de sistema levantados pra Heloim em grupo de WhatsApp — classificação de risco + fluxo de autorização do admin. Reconstrução (22/08/2026) do papel que a Heloim tinha no Base44 antigo, que nunca teve tabela própria.';
