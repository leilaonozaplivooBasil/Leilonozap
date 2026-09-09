-- DIR-112 (09/09/2026) — dono, ao vivo, sobre o Hábito 4 (Contato): "isso
-- gerar uma pontuação... é uma vez só." O script de convite passa a contar
-- ponto pra pessoa na primeira vez que ela escreve um de verdade (não o
-- placeholder) — `script_pontuado_em` é o carimbo que garante o "uma vez só".
ALTER TABLE public.metodo_perfil
  ADD COLUMN IF NOT EXISTS script_pontuado_em TIMESTAMPTZ;

COMMENT ON COLUMN public.metodo_perfil.script_pontuado_em IS
  'Quando o script de contato (Hábito 4) pontuou pela primeira vez — null = ainda não pontuou. Trava o "uma vez só" (DIR-112).';
