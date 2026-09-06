-- Check-in diário do Rank Premiado — "pixel" de engajamento realista.
-- Adiciona last_checkin em concurso_participantes. A API é defensiva (ignora
-- se a coluna não existir), então rodar esta migração é opcional mas recomendado:
-- sem ela o check-in só fica no localStorage do usuário (não sobe pro servidor).
ALTER TABLE concurso_participantes
  ADD COLUMN IF NOT EXISTS last_checkin timestamptz;

-- Índice pra consultar quem confirmou recentemente (futuro: sorteio só de ativos)
CREATE INDEX IF NOT EXISTS idx_concurso_participantes_last_checkin
  ON concurso_participantes (last_checkin DESC);