-- whatsapp-router — reconhecer RESPOSTA (reply) a uma mensagem do bot (27/08/2026).
--
-- Achado investigando "o Zeca parou de responder no grupo": no grupo o bot só fala quando é
-- chamado (#103), e uma das quatro formas de chamar era "responder (reply) uma mensagem
-- dele". Só que essa forma NUNCA funcionou uma única vez. O código procurava o autor da
-- mensagem citada em `referencedMessage` / `quotedMsg` / `quotedMessage` — três campos que
-- não existem no webhook do Z-API. O que o Z-API manda é `referenceMessageId`: o ID da
-- mensagem citada, sem dizer quem escreveu.
--
-- Para saber se aquele ID é de uma mensagem NOSSA, é preciso ter guardado o ID do que o bot
-- mandou. É só isso que esta tabela faz: um INSERT por resposta enviada, e uma consulta por
-- reply recebido.
create table if not exists public.wa_mensagens_bot (
  message_id  text primary key,
  created_at  timestamptz not null default now()
);

comment on table public.wa_mensagens_bot is
  'IDs das mensagens que o whatsapp-router ENVIOU. Serve para reconhecer que um reply (referenceMessageId do Z-API) aponta para uma mensagem do proprio bot — sem isso, responder a mensagem dele no grupo nao o acorda.';

-- RLS ligada e SEM nenhuma policy: ninguem de fora enxerga esta tabela. A function usa a
-- service_role, que passa por cima de RLS por definicao — entao ela continua lendo e
-- gravando normal. Sem isso, uma tabela em `public` fica legivel pela chave anon do
-- projeto, e nao ha motivo nenhum pra isso aqui.
alter table public.wa_mensagens_bot enable row level security;

-- Mesma nota de limpeza da wa_mensagens_processadas: tabela pequena (so um id por resposta).
-- Se um dia crescer demais, "delete where created_at < now() - interval '30 days'" resolve.
