-- O fluxo de 4 passos da demanda no grupo (05/09/2026, pedido do dono):
--   recebe → organiza tecnicamente → confirma se a demanda está certa → confirma se pode postar
--
-- Até aqui a Heloim registrava e PUBLICAVA no Slack na mesma ação, sem passar por ninguém.
-- Estas colunas guardam o rascunho entre um passo e outro. Sem elas não há onde segurar a
-- demanda enquanto o grupo confere — a conversa até tem memória, mas rascunho aguardando
-- aprovação é ESTADO, não histórico.
--
-- Decisões do dono, registradas aqui porque explicam o desenho:
--   • rascunho NÃO expira — fica pendente até alguém confirmar ou descartar.
--   • QUALQUER participante do grupo confirma o conteúdo e libera a postagem.
--   • Aprovar a MUDANÇA no sistema (status aprovada/rejeitada) continua só para admin —
--     é outra coisa, e a foto do formato separa as duas: o post sai "aguardando autorização".

alter table public.heloim_solicitacoes
  add column if not exists titulo    text,        -- vira o cabeçalho em caixa alta do post
  add column if not exists motivo    text,        -- "por que este risco" (linha *Motivo:*)
  add column if not exists anexos    jsonb,       -- [{legenda, bytes}] das imagens da conversa
  add column if not exists etapa     text not null default 'postado'
    check (etapa in ('conteudo', 'postar', 'postado', 'descartado')),
  add column if not exists slack_ts  text,        -- ts da mensagem publicada (permite editar depois)
  add column if not exists slack_canal text;

-- 'postado' como padrão de propósito: as linhas que já existem foram publicadas no formato
-- antigo, direto. Marcar como 'conteudo' faria o bot achar que há rascunho velho esperando
-- confirmação e cobrar o grupo por demanda de agosto.

create index if not exists heloim_solicitacoes_etapa_idx
  on public.heloim_solicitacoes (etapa, created_at desc)
  where etapa in ('conteudo', 'postar');

comment on column public.heloim_solicitacoes.etapa is
  'Onde a demanda está no fluxo de 4 passos: conteudo = rascunho aguardando "está certo"; postar = conteúdo confirmado, aguardando "pode postar"; postado = publicado no Slack; descartado = abandonado.';
