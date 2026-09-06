-- 🏛️ DIR-73 — as agendas da casa marcáveis pelo agendador (06/09/2026).
--
-- Ordem do dono, com o modal "Agendar reunião" aberto na tela: "aqui inserir
-- as agendas e mentorias da empresa — Mentalidade do Executivo, Onboarding,
-- Mentalidade do Diretor, Mentalidade do CEO, Eventos Top College, Treinamento
-- X-eos, reunião com o Marketing, reunião com Financeiro — tudo como funciona
-- o mercado."
--
-- NENHUMA TABELA NOVA, DE PROPÓSITO. Agenda da empresa JÁ É reunioes_empresa
-- (DIR-52). O catálogo das agendas é código (src/lib/agendaEmpresa.js): a grade
-- da casa muda por decisão de gente, não por cadastro de usuário.
--
-- Uma coluna só entra aqui: `agenda_id`, o id do catálogo que originou a linha.
-- Sem ela, "Mentalidade do Diretor" no banco é só um TEXTO — e aí ninguém
-- consegue perguntar depois "quantas Mentalidades do Diretor aconteceram?" sem
-- casar string, que quebra no primeiro acento digitado torto. Fica NULL nas
-- reuniões avulsas cadastradas na mão, que continuam válidas.
ALTER TABLE public.reunioes_empresa ADD COLUMN IF NOT EXISTS agenda_id TEXT;

CREATE INDEX IF NOT EXISTS idx_reunioes_empresa_agenda ON public.reunioes_empresa (agenda_id);

COMMENT ON COLUMN public.reunioes_empresa.agenda_id IS
  'DIR-73: id da agenda do catálogo (src/lib/agendaEmpresa.js) que originou esta reunião. NULL = reunião avulsa cadastrada na mão.';

-- `publico` já existia desde a DIR-52 com DEFAULT ''todos'' e NINGUÉM lia.
-- A partir da DIR-73 ela é lida de verdade: agenda marcada ''diretoria'' some
-- da agenda de quem não é diretoria. Como todas as linhas existentes são
-- ''todos'' (o default), nenhuma reunião já cadastrada muda de comportamento.
