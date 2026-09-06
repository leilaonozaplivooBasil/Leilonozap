-- ⏰ O PRONTO COM PRAZO, E O ENVIAR-E-VOLTAR (06/09/2026)
--
-- Ditado pelo dono: "tem sistema que a gente chama de pronto. Você coloca:
-- começar tal hora e entregar até tal hora — e aparece pra ele dar o pronto
-- até, pra gente sempre poder cobrar o pronto." E, perguntado o que mais
-- melhoraria o enviar-e-voltar, a resposta implementada: a gestão confere
-- (✔✔) ou DEVOLVE a tarefa com um recado, e a pessoa vê o recado embaixo.
--
-- MIGRAÇÃO ADITIVA em metodo_tarefas:
--  • prazo_em        — "pronto até": data e hora limite do pronto
--  • pronto_em       — quando a pessoa deu o pronto (carimbo do feito)
--  • devolvida_motivo / devolvida_em — a tarefa voltou: por quê e quando
ALTER TABLE public.metodo_tarefas
  ADD COLUMN IF NOT EXISTS prazo_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pronto_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS devolvida_motivo TEXT,
  ADD COLUMN IF NOT EXISTS devolvida_em TIMESTAMPTZ;

COMMENT ON COLUMN public.metodo_tarefas.prazo_em IS 'X-PERFORMANCE: "pronto até" — o prazo do pronto.';
COMMENT ON COLUMN public.metodo_tarefas.pronto_em IS 'Quando a pessoa deu o pronto (marcou feito).';
COMMENT ON COLUMN public.metodo_tarefas.devolvida_motivo IS 'A gestão devolveu a tarefa: o recado pra pessoa. Limpa quando ela dá o pronto de novo.';
