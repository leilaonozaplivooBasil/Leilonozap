-- Reconciliação (achado B2 da auditoria pré-publicação, 09/09/2026): esta
-- migração já rodou em produção nesta versão exata (aplicada por uma
-- ferramenta que grava em supabase_migrations.schema_migrations sem
-- passar pelo `supabase db push`) — só não tinha arquivo commitado no
-- repositório. Reproduzida aqui com o texto original, pra um banco novo
-- convergir pro mesmo estado da produção.
ALTER TABLE public.xgame_participantes ADD COLUMN IF NOT EXISTS avisos_pronto smallint NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.xgame_participantes.avisos_pronto IS 'DIR-105: quantos avisos de atraso na Fila do Pronto o admin já deu pra essa pessoa. 0-2 = próximo atraso só desconta pontos (treino); >=3 = próximo atraso zera o dia inteiro (regra radical do DIR-102). Reset manual pelo admin, sem zerar sozinho por ciclo.';

ALTER TABLE public.metodo_tarefas ADD COLUMN IF NOT EXISTS aviso_pronto_em timestamp with time zone;
COMMENT ON COLUMN public.metodo_tarefas.aviso_pronto_em IS 'DIR-105: quando o admin clicou em "avisar" nesta tarefa atrasada da Fila do Pronto. Marca a tarefa pra não contar o mesmo atraso duas vezes no contador de avisos.';
