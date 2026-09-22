-- 📧 REGISTRO DE E-MAILS ENVIADOS
--
-- ⚠️ NÃO APLICADA. Roda junto do merge, com autorização do dono.
--
-- POR QUE EXISTE
-- O levantamento de 19/09/2026 mostrou: a plataforma manda e-mail há meses e
-- não guarda NENHUM registro disso. Não existe resposta para "essa pessoa
-- recebeu o código?", "quando saiu o acesso dela?", "o que foi mandado na
-- campanha?". Na primeira reclamação — de cliente ou de provedor — não há o
-- que mostrar.
--
-- 🔴 O QUE ESTA TABELA NÃO GUARDA, DE PROPÓSITO
-- O CORPO da mensagem nunca entra aqui. E o assunto entra LIMPO: o assunto do
-- código de login é literalmente "483920 é seu código — Leilão NoZap", ou seja,
-- gravar o assunto cru seria gravar a credencial em texto puro, ao lado do
-- e-mail da pessoa. Quem limpa é `api/_lib/registroDeEmail.js`, e tem teste.
-- Também não entram: token de redefinição, senha, link com token.

CREATE TABLE IF NOT EXISTS public.emails_enviados (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  para        text NOT NULL,
  assunto     text,
  tipo        text NOT NULL,
  provedor    text NOT NULL DEFAULT 'brevo',
  message_id  text,
  status      text NOT NULL CHECK (status IN ('enviado', 'recusado')),
  erro        text,
  ator_id     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS emails_enviados_para_idx    ON public.emails_enviados (lower(para), created_at DESC);
CREATE INDEX IF NOT EXISTS emails_enviados_tipo_idx    ON public.emails_enviados (tipo, created_at DESC);
CREATE INDEX IF NOT EXISTS emails_enviados_quando_idx  ON public.emails_enviados (created_at DESC);

-- 🔐 RLS SEM NENHUMA POLÍTICA, E ISSO É A ESCOLHA.
--
-- A convenção das outras tabelas daqui é `USING (true)` — leitura liberada para
-- a chave pública. Aqui NÃO pode: esta tabela é uma lista do e-mail de todo
-- cliente que já recebeu mensagem nossa, e a chave publicável está no pacote do
-- site, à vista de qualquer um. Com RLS ligada e nenhuma política, o anônimo lê
-- zero linhas; a service role (que é quem grava, no servidor) passa por cima da
-- RLS e continua funcionando.
--
-- Quem precisar ler isso numa tela de admin passa por uma função de servidor
-- com guarda de cargo — não pelo PostgREST com a chave pública.
ALTER TABLE public.emails_enviados ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.emails_enviados FROM anon, authenticated;

COMMENT ON TABLE public.emails_enviados IS
  'Registro do que foi enviado por e-mail: destinatario, assunto LIMPO, tipo, provedor, id da mensagem e resultado. Nunca guarda corpo, codigo, token nem senha. Leitura so por service role.';
