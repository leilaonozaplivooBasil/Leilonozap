-- 🎙️ COFRE DOS ÁUDIOS DO X-GAME — bucket PRIVADO (09/09/2026).
--
-- Decisão do dono: guardar o áudio do ditado desde já (a voz da gratidão vira
-- acervo — "ouça a sua gratidão de um ano atrás").
--
-- ⚠️ POR QUE NÃO REAPROVEITEI O `public-assets`, QUE JÁ EXISTE:
-- ele é `public = true`. Todo arquivo lá — inclusive o vídeo da visualização
-- do ritual, que já está lá hoje — é lido por QUALQUER pessoa que tenha o
-- link, sem login. Para print de tarefa isso passa. Para a gravação de alguém
-- dizendo, às 6h da manhã, pelo que é grato, não passa: é voz, é íntimo, e é
-- dado pessoal. O caminho ser difícil de adivinhar não é proteção — é só
-- obscuridade, e obscuridade não se desfaz depois que o arquivo circulou.
--
-- O MOLDE É O `documentos-assinados` (06/08/2026), que já resolveu isto aqui
-- dentro: bucket privado, NENHUMA policy, e leitura só por link assinado de
-- curta validade gerado no servidor.

-- 1) Bucket privado. `public = false` => não existe URL pública pra este
--    conteúdo. Só link assinado, emitido pela rota com service_role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'xgame-audios', 'xgame-audios', false,
  26214400,  -- 25 MB: o mesmo teto do Whisper; áudio de 2 min dá ~1 MB
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) NENHUMA policy é criada para este bucket em storage.objects.
--    Sem policy, `anon` e `authenticated` não leem nem escrevem nada aqui —
--    e como este app inteiro roda como `anon` (o login é app_users, não
--    Supabase Auth), isso significa: o navegador não alcança este cofre.
--    Só a service_role, usada nas rotas do servidor, enxerga.
--
--    É de propósito que não há policy de leitura "do dono": não existe dono
--    reconhecível aqui, porque não existe sessão do Supabase. Quem confere se
--    a pessoa pode ouvir o próprio áudio é a rota, olhando o crachá.
