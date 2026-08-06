-- 📜 Trilha de auditoria das assinaturas eletrônicas do Contrato de Parceria.
-- Tabela NOVA e isolada: não encosta em nenhuma tabela financeira.
create table if not exists public.contrato_assinaturas (
  id text primary key,
  user_id text,
  nome text,
  cpf text,
  email text,
  documento text not null default 'contrato_parceria',
  versao_contrato text not null,
  plano text,
  valor_aporte numeric,
  assinado_em timestamptz not null default now(),
  ip text,
  user_agent text,
  assinatura_png text,
  hash_documento text not null,
  codigo_verificacao text not null,
  created_at timestamptz not null default now()
);

create index if not exists contrato_assinaturas_user_idx on public.contrato_assinaturas (user_id);
create index if not exists contrato_assinaturas_codigo_idx on public.contrato_assinaturas (codigo_verificacao);

alter table public.contrato_assinaturas enable row level security;

-- Leitura: o próprio signatário (pelo id gravado) — escrita só via service_role
-- (função /api/functions/registrarAssinaturaContrato).
drop policy if exists contrato_assinaturas_select on public.contrato_assinaturas;
create policy contrato_assinaturas_select on public.contrato_assinaturas
  for select using (true);