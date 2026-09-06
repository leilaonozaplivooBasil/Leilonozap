-- ⏰ DIR-77 (07/09/2026) — O HORÁRIO É A PONTE ENTRE O QUADRO E O DIA.
--
-- Ordem do dono: "botar os horários da tarefa, que sincroniza no planejamento
-- diário, aparece lá no planejamento diário e também na jornada — tanto na
-- lista como na jornada... o horário de cada tarefa, quando termina."
--
-- POR QUE O HORÁRIO, E NÃO UM BOTÃO DE "MANDAR PRO DIA":
-- O quadro é BACKLOG (o que existe pra fazer) e o dia é COMPROMISSO (o que eu
-- assumo hoje). Mandar todo card pro dia automaticamente incharia o dia — e,
-- como o X-Pay rateia o fixo pelas tarefas do dia, cada tarefa passaria a valer
-- uma fração. O horário resolve isso sozinho, porque é assim que a cabeça já
-- separa as duas coisas: "isso eu faço às 14h" é compromisso; "isso eu preciso
-- fazer algum dia" é backlog. Card COM hora aparece no dia; sem hora, fica no
-- quadro.
ALTER TABLE public.metodo_quadro
  ADD COLUMN IF NOT EXISTS hora TEXT           -- 'HH:mm' — quando começa
  , ADD COLUMN IF NOT EXISTS hora_fim TEXT;    -- 'HH:mm' — quando termina

COMMENT ON COLUMN public.metodo_quadro.hora IS
  'DIR-77: hora de início. Card COM hora vira compromisso do dia (Lista e Jornada); sem hora, fica só no quadro.';
COMMENT ON COLUMN public.metodo_quadro.hora_fim IS
  'DIR-77: hora de término, pra tela mostrar "10:30 às 11:30" — a mesma gramática da agenda da DIR-54.';

-- A tarefa do dia também passa a saber quando TERMINA. Ela já tinha `hora`
-- desde a DIR-43; o fim faltava, e é o que o dono pediu com todas as letras.
ALTER TABLE public.metodo_tarefas
  ADD COLUMN IF NOT EXISTS hora_fim TEXT;

COMMENT ON COLUMN public.metodo_tarefas.hora_fim IS
  'DIR-77: hora de término da tarefa do dia. NULL = só o horário de início, como era antes.';
