-- DIR-168.1 (21/09/2026) — o Encontro da Mentalidade passa a ter VÁRIOS livros
-- da semana (Salomão e Napoleão Hill, por exemplo): lista em `livros`; o campo
-- `livro` (um só) fica como legado e vira o primeiro item quando a lista não existe.
-- Aplicada na produção pela API de gestão em 21/09/2026 (versão 20260921113053).
alter table public.xperf_encontros add column if not exists livros jsonb;
comment on column public.xperf_encontros.livros is 'DIR-168.1: [{titulo, autor, capa_url, pdf_url}, …] — os livros da semana (até 6); substitui o campo legado `livro`';
update public.xperf_encontros
   set livros = jsonb_build_array(livro)
 where livros is null and livro is not null and coalesce(livro->>'titulo', livro->>'pdf_url', livro->>'capa_url', '') <> '';
