-- 🎥 O BALDE DOS VÍDEOS SOBE PRA 200 MB — 11/09/2026
--
-- 🔴 O QUE ISTO CONSERTA: na primeira manhã do ritual em três blocos, DOIS de
-- cinco vídeos foram recusados pelo Storage com "The object exceeded the
-- maximum allowed size". As duas pessoas tinham feito tudo certo — a que
-- gravou o vídeo MAIS CURTO da manhã (121s) foi uma das recusadas, e a que
-- gravou o MAIS LONGO (128s) subiu 20 MB sem problema. Não era duração: era o
-- encoder do aparelho escolhendo o bitrate sozinho, porque o gravador não
-- declarava nenhum (ver src/lib/gravadorDeVideo.js).
--
-- A correção de verdade é o teto no gravador. ESTA migração é o cinto de
-- segurança que fica DEPOIS dele, e ela tem um motivo próprio e específico:
--
--   a visualização tem teto de emergência de 15 MINUTOS (VISUALIZACAO_TETO_SEG).
--   15 min × 1 Mbps = 112,5 MB > 100 MB.
--
-- Ou seja: mesmo com o gravador consertado, a própria rede de segurança do
-- ritual ainda produziria um arquivo que o balde recusa. Com 200 MB, o pior
-- caso possível cabe com folga, e o caso real (2 min = 15 MB) cabe treze vezes.
--
-- Subir um limite não retira nada de ninguém e não toca em arquivo existente:
-- é `alter` de configuração do balde, reversível trocando o número de volta.
update storage.buckets
   set file_size_limit = 209715200  -- 200 MB
 where id = 'xgame-videos';
