-- 🎥 COFRE DOS VÍDEOS DO RITUAL — bucket PRIVADO (09/09/2026).
--
-- 🔴 O QUE ISTO CONSERTA: a gravação da visualização do ritual ia pro
-- `public-assets`, que é `public = true`. Medido em 09/09: 9 vídeos do rosto
-- de alguém meditando às 6h da manhã, abertos por qualquer pessoa com o link,
-- sem login. E a própria tela promete "o vídeo é a sua comprovação — só você e
-- o gestor veem" (XGameRitualAmanhecer). A tela dizia a verdade que o sistema
-- não cumpria.
--
-- É a MESMA exposição que motivou o cofre da voz um pouco antes, e aqui é
-- pior: voz é íntimo, imagem é identificável.
--
-- Molde: `documentos-assinados` (06/08) e `xgame-audios` (09/09) — bucket
-- privado, NENHUMA policy, leitura só por link assinado gerado no servidor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'xgame-videos', 'xgame-videos', false,
  104857600,  -- 100 MB: a visualização tem piso de 60s e teto de 15 min
  array['video/webm', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- NENHUMA policy, de propósito: este app fala com o Supabase como `anon` (o
-- login é app_users, não Supabase Auth), então qualquer policy que deixasse o
-- navegador escrever deixaria QUALQUER UM escrever. Quem confere se a pessoa
-- pode ver a própria gravação é a rota `videoDoRitual`, olhando o crachá.
