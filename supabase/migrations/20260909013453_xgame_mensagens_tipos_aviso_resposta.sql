-- Reconciliação (achado B2 da auditoria pré-publicação, 09/09/2026): esta
-- migração já rodou em produção nesta versão exata — só não tinha arquivo
-- commitado no repositório. Reproduzida aqui com o texto original.
ALTER TABLE public.xgame_mensagens DROP CONSTRAINT xgame_mensagens_tipo_check;
ALTER TABLE public.xgame_mensagens ADD CONSTRAINT xgame_mensagens_tipo_check
  CHECK (tipo IN ('sugestao','pedido','agradecimento','demanda','aviso','resposta'));
COMMENT ON CONSTRAINT xgame_mensagens_tipo_check ON public.xgame_mensagens IS 'DIR-107: aviso = gerado automaticamente pelo botao avisar da Fila do Pronto; resposta = retorno de quem recebeu, direto por dentro da plataforma.';
