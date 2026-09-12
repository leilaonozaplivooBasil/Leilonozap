-- whatsapp-router — idempotência de webhook (22/08/2026).
--
-- Achado em produção: mesmo devolvendo 200 imediatamente (EdgeRuntime.waitUntil, ver
-- commit anterior), o Zeca voltou a duplicar resposta. Ou seja, não era só lentidão —
-- o Z-API entrega o mesmo webhook mais de uma vez por natureza ("at-least-once
-- delivery", comportamento comum de provedor de webhook, não é bug do lado deles
-- necessariamente). A defesa certa não é responder mais rápido, é nunca processar a
-- mesma mensagem duas vezes — daí esta tabela.
create table if not exists public.wa_mensagens_processadas (
  message_id  text primary key,
  created_at  timestamptz not null default now()
);

comment on table public.wa_mensagens_processadas is
  'Idempotência do whatsapp-router: um INSERT aqui por mensagem recebida. Se o Z-API reentregar o mesmo webhook, o INSERT bate na primary key e a function sabe pular o reprocessamento.';

-- Limpeza: sem índice de expiração automática por enquanto (tabela pequena, só guarda
-- message_id — se crescer demais, um cron simples de "delete where created_at < now() -
-- interval '30 days'" resolve, mesmo padrão do expirarReservasEstoque).
