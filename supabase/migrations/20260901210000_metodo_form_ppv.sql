-- DIR-41 (01/09/2026) — O MÉTODO NO CRM (os 8 Hábitos do dono):
-- 1) FORM (Hábito 4 — Família, Ocupação, Recreação, Mensagem): o vendedor
--    registra o que sabe da PESSOA antes de abordar — guardado no cliente.
-- 2) Objeção atual (Hábito 6 — gestão de objeções): qual das objeções do
--    método está travando a negociação da esteira.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS form_metodo JSONB;

COMMENT ON COLUMN public.customers.form_metodo IS
  'Método FORM (DIR-41): {familia, ocupacao, recreacao, mensagem} — o que se sabe da pessoa antes de abordar';

ALTER TABLE public.captacao_oportunidades
  ADD COLUMN IF NOT EXISTS objecao TEXT;

COMMENT ON COLUMN public.captacao_oportunidades.objecao IS
  'Objeção atual do método (DIR-41): nao_tenho_dinheiro | preciso_pensar | tenho_medo | nao_conheco | outra';
