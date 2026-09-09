-- Reconciliação (achado B2 da auditoria pré-publicação, 09/09/2026): esta
-- migração já rodou em produção nesta versão exata (aplicada por uma
-- ferramenta que grava em supabase_migrations.schema_migrations sem
-- passar pelo `supabase db push`) — só não tinha arquivo commitado no
-- repositório. Reproduzida aqui com o texto original (incluindo as
-- políticas ABERTAS que valiam então), pra um banco novo convergir pro
-- mesmo histórico da produção. A correção de segurança (achado B1) mora
-- na migração seguinte, `20260909050751_xgame_mensagens_rls.sql`.
CREATE TABLE public.xgame_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_id text NOT NULL,
  remetente_nome text NOT NULL,
  destino_tipo text NOT NULL CHECK (destino_tipo IN ('ceo','diretoria','executivos','pessoa')),
  destino_id text,
  destino_nome text,
  tipo text NOT NULL CHECK (tipo IN ('sugestao','pedido','agradecimento','demanda')),
  texto text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.xgame_mensagens IS 'DIR-106: mensagens internas do time corporativo do X-GAME — sugestao/pedido/agradecimento pro CEO, Diretoria ou Executivos, e demanda de colega pra colega. Dono: "precisa ser algo que eles queiram compartilhar... nao pode ser bobeira".';

ALTER TABLE public.xgame_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY xgame_mensagens_select ON public.xgame_mensagens FOR SELECT USING (true);
CREATE POLICY xgame_mensagens_insert ON public.xgame_mensagens FOR INSERT WITH CHECK (true);
CREATE POLICY xgame_mensagens_update ON public.xgame_mensagens FOR UPDATE USING (true);

CREATE INDEX xgame_mensagens_destino_idx ON public.xgame_mensagens (destino_tipo, destino_id, lida);
CREATE INDEX xgame_mensagens_remetente_idx ON public.xgame_mensagens (remetente_id);
