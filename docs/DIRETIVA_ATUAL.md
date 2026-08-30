# DIRETIVA ATUAL — Leilão NoZap

> Este arquivo contém **só a diretiva de engenharia em vigor agora** — o que
> está autorizado a acontecer nesta rodada, e nada além disso. Quando uma
> diretiva nova for definida (pelo dono ou pela OpenAI), este arquivo é
> **substituído** pelo conteúdo da diretiva nova; a versão anterior não se
> perde — vai para `docs/HISTORICO_DIRETIVAS.md` no mesmo commit, e o
> resultado dela para `docs/RELATORIOS_EXECUCAO.md`.
>
> Formato fixo desta diretiva e de toda diretiva futura:
> `docs/PADRAO_DIRETIVAS.md`.

---

## DIR-17 — Painel de Alavancagem somava um subconjunto arbitrário de 1000 vendas

**Emitida por:** Claude, via achado técnico — dono comparou os dois painéis
de novo ("Valor total gerado" R$ 6.173,80 no Painel vs R$ 7.076,80 no
espelho do CRM, 25 vs 26 compradores) e exigiu análise sênior por escrito:
"encontre o certo e corrija onde está errado, eu preciso saber em qual
acreditar".
**Data:** 30/08/2026.
**Objetivo:** `NetworkOverview.jsx:571` buscava as vendas com
`CatalogSale.list()` — sem ordenação e sem limite. O adapter então ordena
só por `id` (uuid aleatório, não cronológico) e o Supabase corta a
resposta em 1000 linhas por padrão. Com `catalog_sales` acima de 1000
registros, o Painel somava um SUBCONJUNTO ARBITRÁRIO de 1000 vendas —
compras reais ficavam de fora sem aviso (medido: R$ 903,00 e 1 comprador
a menos que o CRM lendo o MESMO banco). O certo é o CRM (busca
`'-created_date'` com limite explícito: a janela sempre contém as vendas
mais recentes, então toda venda pós-marco entra).
**Escopo autorizado:** `NetworkOverview.jsx` passa a buscar
`CatalogSale.list('-created_date', 5000)`; `CrmClientesTab.jsx` alinhado
aos mesmos parâmetros (2000 → 5000) — telas que somam o mesmo dinheiro
leem as mesmas linhas.
**Fora do escopo / proibido:** qualquer mudança de fórmula/critério (o
`dinheiroReal.js` da DIR-15 fica intacto); a diferença R$ 201,24 entre
"Volume Financeiro Total" e o espelho é INTENCIONAL (leilão, documentada
no tooltip) e não foi tocada.
**Regras fixas:** nenhuma além da DIR-5 a DIR-16.
**Status:** EM VIGOR — código, testes (443/443) e build passam; falta o
dono confirmar no Preview que os dois painéis agora mostram o mesmo
número.

---

## DIR-16 — Espelho do Painel de Alavancagem dentro do CRM

**Emitida por:** dono, pedido direto: "insira exatamente as informações que
tem lá [Painel de Alavancagem], aqui [no CRM], não invente, vamos
organizar de forma sênior".
**Data:** 30/08/2026.
**Objetivo:** depois de confirmar com dado real que os dois painéis batiam
(mesmo critério, `src/lib/dinheiroReal.js`, DIR-15), o dono quis ver os
MESMOS rótulos e a MESMA fórmula do Painel de Alavancagem dentro do CRM,
lado a lado com os cards já existentes — não outra métrica inventada, uma
cópia fiel.
**Escopo autorizado:**
1. Novo bloco "Espelho do Painel de Alavancagem" em `CrmClientesTab.jsx`/
   `CrmStatsCards.jsx`, com os MESMOS 8 números de `NetworkOverview.jsx`
   (Total na base, Novos 30 dias, Compradores únicos, Conversão geral,
   Compraram nos últimos 30 dias, Depósitos, Valor total gerado, Ticket
   médio/comprador) — fórmula copiada literalmente de
   `fetchFinanceStats`/`conversion`, só trocando a base de dados (rede do
   dono → rede/plataforma de quem olha o CRM). "Valor total gerado" aqui é
   só depósito + compra de Loja, sem leilão, pra ser comparável célula a
   célula com o Painel de Alavancagem (diferente do "Volume Financeiro
   Total" da DIR-14, que inclui leilão de propósito).
2. **Achado à parte, corrigido junto:** o dono reportou "Valor Investido em
   Estoque: R$ 50.485,429" (3 casas decimais, formato errado). Causa:
   `fmtBRL` usava `toLocaleString` só com `minimumFractionDigits: 2`, sem
   `maximumFractionDigits` — o padrão do JS nesse caso é até 3 casas, e
   imprecisão de ponto flutuante (soma de `cost_price × quantity` linha a
   linha) empurrava pra 3ª casa. Corrigido com `maximumFractionDigits: 2`
   explícito.
**Fora do escopo / proibido:** mudar a regra de reconhecimento de receita;
mudar `financial_income`/`finalizeAuctionCore.js`; mudar o "Volume
Financeiro Total" já existente (fica como está, ao lado do espelho novo).
**Regras fixas:** nenhuma além da DIR-5 a DIR-15.
**Status:** EM VIGOR — código, testes (443/443) e build passam. Falta o
dono conferir visualmente no Preview/produção depois do deploy — os 8
números do espelho devem bater exatamente com o que aparece no Painel de
Alavancagem (ajustado pela diferença de escopo, se o dono não for
super_admin).

---

## Estado agora

CRM e Financeiro têm a lógica, os dados e a leitura (RLS) corretos.
"Faturamento Total" = R$ 1.367,17 (comissão de Loja Virtual + Leilão),
confirmado direto no banco. "Volume Financeiro Total" (depósito + venda
bruta de Loja/PDV/Leilão) e o novo "Espelho do Painel de Alavancagem"
(DIR-16) usam o MESMO critério de "dinheiro real" que o Painel de
Alavancagem (`src/lib/dinheiroReal.js`, DIR-15) — as telas não podem mais
divergir, porque é literalmente a mesma função. Falta o dono conferir
visualmente no Preview/produção depois do deploy.

**Achado crítico de infraestrutura, fora do escopo de código, aguardando o
dono (ver `REL-11`):** o deploy automático de migração
(`.github/workflows/deploy-migrations.yml`) nunca funcionou — 9
execuções, 9 falhas, `supabase db push` nunca rodou uma vez na história do
repositório. Causa atual: o segredo `SUPABASE_ACCESS_TOKEN` no GitHub está
com formato inválido. Enquanto isso não for corrigido, toda migration
nova precisa ser conferida e, se faltar, colada manualmente no SQL Editor
do Supabase (ver `supabase/migrations/LEIA-ME.md` pra saber como conferir).
Passo pro dono corrigir de vez: gerar um token novo em
`supabase.com/dashboard/account/tokens` (formato `sbp_...`) e atualizar o
segredo em `Settings → Secrets and variables → Actions` do repositório.

**Efeito colateral da DIR-13 a observar:** o dropdown manual de
`CatalogOrdersAdmin.jsx` que deixava o admin marcar um pedido "Aguardando
Pagamento" como "Pago" na mão agora é recusado (mensagem explicando o
porquê). Se esse botão for realmente necessário pra confirmar pagamento
fora do sistema (ex.: transferência bancária manual), isso precisa de uma
diretiva própria pra construir uma rota nova que calcule comissão e
registre receita — não só destravar o PATCH de novo.

Pendências ainda abertas, sem diretiva própria no momento:
- `REL-2`: confirmação do 401 na Edge Function `preview-api`, do lado da
  OpenAI.
- Fase 3 do Financeiro (conciliação automática, decisão sobre Open
  Finance).
- Fase 2 do CRM (persistência automática em `customers`, unificação de
  "Vendedor").
- Migration `20260828_financial_expenses_payment_account.sql` (de outra
  frente, não desta sessão) — status em produção não confirmado; mesmo
  risco do pipeline quebrado pode se aplicar a ela também.
- **Backfill histórico de adesão/seller_adhesion legado** (achado na
  DIR-13): receita real de adesão de vendedor e plano parceiro anterior a
  ~21-28/08/2026 mora em tabelas com semântica diferente
  (`partner_plan_purchases`, `contrato_assinaturas`, saldo de vendedor do
  Base44) — recuperar isso não é um backfill simples, é decisão de
  negócio se vale o esforço de "traduzir" esse histórico.

**Nenhuma implementação nova começa até uma diretiva nova ser registrada
aqui,** no formato de `docs/PADRAO_DIRETIVAS.md`.
