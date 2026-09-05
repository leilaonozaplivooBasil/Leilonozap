-- A fala CRUA de quem pediu, guardada junto da leitura técnica.
--
-- 05/09/2026, pedido do dono: "garanta a melhor compreensão possível aos pedidos feitos ao
-- Zeca (…) para que ele possa documentar no slack exatamente como foi dito no grupo".
--
-- `descricao` é o pedido organizado tecnicamente. `citacao` é o que a pessoa escreveu,
-- palavra por palavra. As duas juntas porque uma sozinha não serve: só a técnica perde o que
-- foi realmente dito, e só a crua não organiza nada. No post do Slack a citação sai em bloco
-- de citação (">"), pra ficar evidente que ali ninguém reescreveu nada.
--
-- Até aqui o schema da ferramenta pedia a descrição "resumida em 1-2 frases" — ou seja, o
-- próprio contrato mandava comprimir o pedido. Era o oposto do que o dono queria.

alter table public.heloim_solicitacoes
  add column if not exists citacao text;

comment on column public.heloim_solicitacoes.citacao is
  'A fala de quem pediu, copiada palavra por palavra do grupo — sem correção, resumo ou sinônimo. Complementa descricao, que é a leitura técnica do mesmo pedido.';
