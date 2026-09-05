-- X-GAME F10 (05/09/2026) — VALIDAÇÃO AUTOMÁTICA: toda tarefa pode exigir
-- comprovação, validada pelo sistema sem depender de ninguém.
--   validacao: o tipo exigido — NULL = automática (o app deduz do título:
--     story/post → 'instagram', leitura/estudo → 'aprendizado'),
--     'nenhuma' = sem comprovação, 'instagram' = link do post/story do dia,
--     'aprendizado' = escrever o principal aprendizado da leitura.
--   comprovacao: o que a pessoa entregou — {tipo, entrega, quando, valido}.
ALTER TABLE public.metodo_tarefas
  ADD COLUMN IF NOT EXISTS validacao TEXT,
  ADD COLUMN IF NOT EXISTS comprovacao JSONB;

COMMENT ON COLUMN public.metodo_tarefas.validacao IS
  'X-GAME F10: tipo de comprovação exigida (NULL=automática pelo título · nenhuma · instagram · aprendizado)';
COMMENT ON COLUMN public.metodo_tarefas.comprovacao IS
  'X-GAME F10: a comprovação entregue {tipo, entrega, quando, valido} — validada pelo app na hora';
