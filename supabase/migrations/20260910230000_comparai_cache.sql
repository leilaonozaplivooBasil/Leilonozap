-- 💾 CACHE DO COMPAREAQUI — 10/09/2026
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE ESTA TABELA EXISTE
-- ═══════════════════════════════════════════════════════════════════════════
-- O motor de comparação (api/_lib/marketSearch.js) NUNCA teve cache. O
-- `comparaiPrices.js` devolvia `cached: false` escrito na mão e o navegador
-- mandava `forceRefresh: false` num campo que o servidor nunca leu — restos do
-- contrato do Base44, onde o cache era esperado e nunca foi construído aqui.
--
-- 🔴 O preço disso, medido no painel da SerpApi em 10/09:
--
--     plano ............... 5.000 buscas/mês
--     consumidas .......... 4.005
--     restantes ...............995
--     último pagamento .... RECUSADO (cartão sem fundos)
--
-- Cada clique em "Comparar Preços" gastava de 2 a 3 buscas. Cada "tenta de
-- novo" (o erro era intermitente) gastava mais 2 a 3. E o mesmo motor roda em
-- laço no `calculateProductPricing`, a análise de preço do importador: um lote
-- de 50 produtos chega a 150 buscas. Duas análises zeravam a conta.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE É GUARDADO — E O QUE DE PROPÓSITO NÃO É
-- ═══════════════════════════════════════════════════════════════════════════
-- Guarda SÓ o resultado da busca de mercado (as ofertas das lojas, a média, a
-- mediana). NÃO guarda o nosso preço nem a economia: esses saem do banco e são
-- recalculados a cada abertura. O preço de mercado de um produto não muda de
-- minuto em minuto; o lance do leilão muda. Separar os dois é o que permite
-- guardar por dias sem nunca mostrar economia velha pro cliente.
--
-- A chave carrega uma impressão digital do TÍTULO e da FOTO usados na busca:
-- mudou a descrição ou a imagem do produto, a chave muda e a busca é refeita.

create table if not exists public.comparai_cache (
  chave       text primary key,
  entidade    text not null,            -- 'product' | 'auction'
  entidade_id text not null,
  payload     jsonb not null,           -- o retorno de searchMarket()
  fonte       text,                     -- qual fonte venceu (serpapi, zoom…)
  criado_em   timestamptz not null default now(),
  expira_em   timestamptz not null
);

create index if not exists comparai_cache_expira_idx on public.comparai_cache (expira_em);
create index if not exists comparai_cache_entidade_idx on public.comparai_cache (entidade, entidade_id);

-- 🔒 RLS LIGADA NA MESMA MIGRAÇÃO — regra do LEIA-ME de supabase/migrations.
alter table public.comparai_cache enable row level security;

-- Nenhuma política: leitura E escrita ficam exclusivas do service_role, que é
-- por onde as rotas de api/ falam. O navegador não lê nem escreve cache —
-- ele pede a comparação pra rota, e a rota decide se responde do cache.
-- (Diferente do padrão de `suporte_chamados`, que libera SELECT: aqui não há
-- motivo nenhum pro cliente ler a tabela, e cache legível é cache envenenável.)
