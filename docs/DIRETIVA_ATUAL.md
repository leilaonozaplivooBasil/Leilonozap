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

## DIR-15 — total_spent do CRM contava venda não paga como dinheiro real

**Emitida por:** Claude, via achado técnico — o dono comparou os números do
CRM com os do Painel de Alavancagem (`NetworkOverview.jsx`, que já tem um
filtro rigoroso de "dinheiro real") e perguntou "qual está certo, qual
está errado, não é possível???". Investigando a fonte do "Volume
Financeiro Total"/"Volume Transacionado" (`crmUnifiedCustomers.js`,
`total_spent`), achei que ele soma QUALQUER `catalog_sales` — inclusive
`pending_payment` e `canceled` — como se fosse dinheiro que já entrou.
**Data:** 30/08/2026.
**Objetivo:** mesmo defeito de conceito já corrigido em `financial_income`
(DIR-7) e no filtro `isPaga` do `NetworkOverview.jsx`: venda não paga não é
dinheiro. Corrigir pra `total_spent`/`purchase_count` (Loja Virtual/PDV)
só somarem venda com status realmente pago (mesmo conjunto `JA_PAGO` já
usado em `updateOrderStatus.js`/`CatalogOrdersAdmin.jsx`, cobrindo os dois
idiomas de status que o banco mistura — PONTO 116).
**Escopo autorizado:** `src/lib/crmUnifiedCustomers.js` — filtro de status
pago aplicado às 3 gravações de `total_spent`/`purchase_count` vindas de
`catalogSales` (conta identificada, avulso existente, avulso novo). Teste
novo (`tests/crmUnifiedCustomersTotalSpent.test.mjs`) cobrindo paga,
pendente, cancelada, status em português e comprador avulso.
**Correção de escopo, mesma diretiva, mesmo dia:** depois de deployado, o
dono mandou print mostrando "Venda bruta (Loja + Leilão): R$ 228.496,40" —
impossível, a comissão real de Loja Virtual (R$ 1.317,56) implicaria uns
R$ 4.400 de venda bruta, não R$ 228 mil. Achei DUAS causas juntas: (1) o
card usava `unifiedCustomers.total_spent`, que soma TODO `catalog_sales`
do comprador sem filtrar `kind` — depósito, adesão, plano parceiro e
passaporte entravam junto, misturados com "venda"; (2) do lado do leilão,
somava `current_price` de QUALQUER `winner_id`, incluindo os 36 leilões
"Plano de Investimento" (`is_investment_plan`, R$ 5.000 cada, ~R$ 180 mil)
— que o próprio motor de comissão do leilão já trata como aporte de
investimento, não mercadoria vendida (PONTO 109/123,
`finalizeAuctionCore.js`). Recalculado direto de `networkCatalogSales`/
`networkAuctions` com os mesmos filtros de `kind` que o Painel de
Alavancagem usa, excluindo plano de investimento e leilão de teste do
lado do leilão.
**Fora do escopo / proibido (flagged, não corrigido nesta rodada):** dentro
dos leilões que sobram depois de excluir plano de investimento/teste,
ainda não dá pra confirmar com 100% de certeza que TODOS foram realmente
pagos (não só arrematados) — `auctions.order_status` NÃO é atualizado pra
`'paid'` quando o arremate é pago via PIX/cartão (só `mpWebhook.js` grava
o status em `catalog_sales`, nunca em `auctions`; confirmado por leitura
completa do arquivo). Usar `order_status` como filtro excluiria arremates
pagos de verdade por PIX/cartão — um bug novo, pior que o atual. Precisa
de uma forma confiável de ligar `catalog_sales` (kind='arremate') ao
`auctions.id` de origem (hoje sem FK direta, só dentro de `raw_base44`,
JSON não indexado) antes de refinar mais — fica como pendência registrada,
o erro residual esperado é muito menor que os R$ 180 mil já eliminados.
**Regras fixas:** nenhuma além da DIR-5 a DIR-14.
**Status:** EM VIGOR — código e teste prontos, aguardando confirmação
visual do dono no Preview/produção depois do deploy.

---

## Estado agora

CRM e Financeiro têm a lógica, os dados e a leitura (RLS) corretos.
"Faturamento Total" = R$ 1.367,17 (comissão de Loja Virtual + Leilão),
confirmado direto no banco. "Volume Financeiro Total" (depósito + venda
bruta de Loja/PDV/Leilão) é um card novo e separado, pra visão de volume
movimentado sem misturar com receita, e agora só conta venda realmente
paga (DIR-15) — falta só o dono conferir visualmente no Preview/produção
depois do próximo deploy.

**Pendência técnica em aberto, registrada mas não corrigida (DIR-15):**
depois de excluir depósito/adesão/plano de investimento da soma (já
feito), o volume de LEILÃO no CRM ainda pode incluir um resíduo pequeno de
arremates arrematados mas nunca pagos, porque não existe hoje um jeito
confiável e barato de checar isso sem arriscar excluir arremates pagos
por PIX/cartão (ver detalhe na DIR-15 em `docs/HISTORICO_DIRETIVAS.md`).
Precisa de investigação própria (ligar `catalog_sales` ao `auctions.id`
de origem) antes de mexer mais.

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
