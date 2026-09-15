-- 🎬 VÍDEO NO PRODUTO — 15/09/2026
--
-- Pedido do dono: "pela gestão de estoque, ao criar ou editar um produto,
-- também ter a função de anexar vídeo ou colocar link de vídeo."
--
-- ── POR QUE `video_urls` É LISTA (jsonb), E NÃO UM TEXTO ─────────────────────
-- A tela de hoje aceita UM vídeo por produto — a lista terá 0 ou 1 item. Mesmo
-- assim ela nasce lista, pela mesma forma de `image_urls`, que o código inteiro
-- já sabe manipular (filtrar, ordenar, contar). Custa o mesmo agora e evita uma
-- migração de TIPO depois, que obrigaria a mexer em todo consumidor.
--
-- ── E POR QUE UMA COLUNA SÓ PARA LINK E ARQUIVO ─────────────────────────────
-- Link de YouTube e arquivo nosso do Storage moram na MESMA lista. Quem decide
-- como tocar é o player, olhando o host (src/lib/videoDoProduto.js): host
-- conhecido vira <iframe>, endereço do nosso Storage vira <video>. Duas colunas
-- criariam o estado impossível "as duas preenchidas" e a pergunta "qual ganha".
alter table public.products
  add column if not exists video_urls jsonb not null default '[]'::jsonb;

comment on column public.products.video_urls is
  'Vídeos do produto. Lista de endereços: link de host conhecido (YouTube/Vimeo) '
  'ou arquivo no nosso Storage (balde videos-produtos). Quem sabe tocar cada um '
  'é src/lib/videoDoProduto.js. Hoje a tela grava no máximo 1.';

-- ── O BALDE DO VÍDEO PRÓPRIO ────────────────────────────────────────────────
-- PÚBLICO, ao contrário de `xgame-videos` (que é cofre de ritual, íntimo e
-- privado). Vídeo de produto é vitrine: se não puder ser lido sem sessão, não
-- serve pra página de venda.
--
-- 🔴 O TETO É DECISÃO DE CUSTO, NÃO DE TÉCNICA. Um vídeo de 25 MB visto por mil
-- pessoas gasta 25 GB de saída, e o Supabase cobra egress por GB acima da
-- franquia. 50 MB cobre com folga um vídeo de produto real (30-60s), e é
-- quatro vezes menor que o balde do ritual — de propósito: aqui a conta é
-- multiplicada por quem ASSISTE, lá por quem GRAVA.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos-produtos', 'videos-produtos', true,
  52428800,  -- 50 MB
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pública e escrita pelo navegador, exatamente como os baldes de
-- imagem que a Gestão de Estoque já usa (política "Anon upload during import").
-- Quem sobe vídeo aqui é admin logado na tela de produto; a conferência de
-- cargo é da rota productAdminAction, não do Storage.
do $$
begin
  if not exists (
    select 1 from pg_policy
     where polrelid = 'storage.objects'::regclass
       and polname = 'Video de produto: leitura publica'
  ) then
    create policy "Video de produto: leitura publica"
      on storage.objects for select
      using (bucket_id = 'videos-produtos');
  end if;

  if not exists (
    select 1 from pg_policy
     where polrelid = 'storage.objects'::regclass
       and polname = 'Video de produto: envio pelo app'
  ) then
    create policy "Video de produto: envio pelo app"
      on storage.objects for insert to anon
      with check (bucket_id = 'videos-produtos');
  end if;
end $$;
