-- DIR-168 (21/09/2026) — Encontro da Mentalidade: o livro da semana (capa + PDF),
-- as lâminas editáveis e a pauta viva (a lista tipo Trello do que precisa ser
-- conversado, que aparece na última lâmina e sobrevive de uma segunda pra outra).
-- Aplicada na produção pela API de gestão em 21/09/2026 (versão 20260921110434).

alter table public.xperf_encontros
  add column if not exists livro jsonb,
  add column if not exists laminas jsonb;

comment on column public.xperf_encontros.livro is 'DIR-168: {titulo, autor, capa_url, pdf_url} — o livro da semana (leitura de 15 min; o treinamento é baseado nele)';
comment on column public.xperf_encontros.laminas is 'DIR-168: {ajustes: {id: {titulo, sub, corpo[], oculta}}, extras: [{id, apos, bloco, titulo, sub, corpo[]}]} — o que foi editado à mão nas lâminas da apresentação';

create table if not exists public.xperf_encontro_pautas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  detalhe text,
  autor_id text,
  autor_nome text,
  status text not null default 'aberta' check (status in ('aberta', 'conversada', 'concluida')),
  ordem integer not null default 0,
  encontro_data date,
  concluida_em timestamptz,
  demanda_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.xperf_encontro_pautas is 'DIR-168: a pauta viva do Encontro da Mentalidade — tudo que precisa ser conversado na Produção (10h–12h). Aberta/conversada/concluída; o que não conclui volta na próxima segunda.';
create index if not exists xperf_encontro_pautas_status_idx on public.xperf_encontro_pautas (status, ordem, created_at);

alter table public.xperf_encontro_pautas enable row level security;
-- Mesmo regime do xperf_encontros (telas internas da Central de Vendas, lidas e
-- escritas com a chave publicável pelo painel do time).
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'xperf_encontro_pautas' and policyname = 'xperf_encontro_pautas_select') then
    create policy xperf_encontro_pautas_select on public.xperf_encontro_pautas for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'xperf_encontro_pautas' and policyname = 'xperf_encontro_pautas_insert') then
    create policy xperf_encontro_pautas_insert on public.xperf_encontro_pautas for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'xperf_encontro_pautas' and policyname = 'xperf_encontro_pautas_update') then
    create policy xperf_encontro_pautas_update on public.xperf_encontro_pautas for update using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'xperf_encontro_pautas' and policyname = 'xperf_encontro_pautas_delete') then
    create policy xperf_encontro_pautas_delete on public.xperf_encontro_pautas for delete using (true);
  end if;
end $$;
grant select, insert, update, delete on public.xperf_encontro_pautas to anon, authenticated;

-- O balde do material do encontro: capa do livro (imagem) e o PDF do livro.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'encontro-materiais', 'encontro-materiais', true,
  31457280,  -- 30 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policy where polrelid = 'storage.objects'::regclass and polname = 'Material do encontro: leitura publica') then
    create policy "Material do encontro: leitura publica" on storage.objects for select using (bucket_id = 'encontro-materiais');
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'storage.objects'::regclass and polname = 'Material do encontro: envio pelo app') then
    create policy "Material do encontro: envio pelo app" on storage.objects for insert to anon with check (bucket_id = 'encontro-materiais');
  end if;
end $$;
