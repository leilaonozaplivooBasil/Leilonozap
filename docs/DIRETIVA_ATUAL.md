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

## DIR-21 — Volume em Negociação real + Faturamento Bruto no CRM

**Emitida por:** dono, decisão direta de negócio (30/08/2026): (1) "Volume
em Negociação: mude para pessoas que chegam no carrinho e não compram
ainda, ou fizeram pedidos e desistiram, e também insira pedidos cancelados
pela instituição e pagamento — precisa inserir esses dois"; (2) "o
Faturamento de 1.638,08 está errado — esse valor é o valor comprado na
Loja Virtual, que é de fato o faturamento bruto".
**Data:** 30/08/2026.
**Escopo autorizado:**
1. "Volume em Negociação" = pedidos de Loja gerados e não pagos
   (`pending_payment` — não existe carrinho persistido no servidor; o
   pedido pendente é o rastro real de "chegou no carrinho e desistiu") +
   pedidos cancelados/estornados + negociações manuais em andamento, tudo
   pós-marco (01/08). Tooltip mostra a composição das três parcelas.
2. Card do super_admin renomeado "Faturamento Bruto (Loja Virtual)" =
   `comprasBrutas` (valor cheio das compras pagas e confirmadas, critério
   oficial de dinheiro real). **A regra da DIR-7 NÃO muda:** a comissão
   continua sendo a receita da empresa em `financial_income`, base do
   Financeiro e do imposto — só o card do CRM passa a mostrar o bruto, por
   decisão expressa do dono. `financial_income` deixou de ser carregado no
   CRM (não é mais usado nele).
**Fora do escopo / proibido:** regra de reconhecimento de receita (DIR-7),
`financial_income`, módulo Financeiro, visão de rede (Volume Transacionado
continua igual).
**Regras fixas:** nenhuma além da DIR-5 a DIR-20.
**Status:** EM VIGOR — código, testes (466/466) e build passam; aguarda
conferência do dono no Preview e autorização pra publicar o pacote
DIR-18 a 21.

---

## DIR-20 — Estoque cristalino: número único validado no banco

**Emitida por:** dono ("vamos fazer uma análise extremamente diligente na
Gestão de Produtos, os números não estão batendo, preciso deixar isso
cristalino"), com diagnóstico fechado por 4 consultas diretas dele ao banco.
**Data:** 30/08/2026.
**Objetivo:** três telas mostravam três "valores de estoque" diferentes
(CRM R$ 9.309 / Gestão R$ 29.951 / real R$ 28.133) porque cada uma usava
população e fórmula próprias. Números validados direto no banco:
- Investido histórico em todos os lotes: R$ 108.232,54.
- Parado em estoque AGORA (fatia não vendida, contando estoque físico da
  grade): **R$ 28.133,45** — este é o número oficial.
- 184 produtos com `quantity = 0` mas estoque físico real nas colunas de
  grade (Perfeito/Bom/Oficina/Ruim, que não são baixadas na venda) —
  invisíveis pra qualquer conta baseada só em `quantity`.
- "Receita Potencial R$ 5,08 milhões" da Gestão: 95% vem de UM produto com
  preço podre (Mini Localizador GPS a R$ 12.226,61/un × 394 — o valor
  gravado é o preço do LOTE; o unitário real é R$ 31,03).
**Escopo autorizado:**
1. `custoProduto.js` (cliente + espelho servidor) ganha `unidadesFisicas`/
   `unidadesEmEstoque` (= max(quantity, grade − vendidas)) e `custoUnitario`
   passa a usar o estoque real — fórmula idêntica à validada no banco.
2. CRM: "Valor Investido em Estoque" soma o GALPÃO INTEIRO (todos os
   produtos, não só os 302 do catálogo); card "Produtos em Estoque"
   renomeado "Produtos no Catálogo"; tooltips explicando as definições.
3. Gestão de Estoque: "Capital em Estoque" vira o custo parado AGORA
   (mesma conta do CRM — antes era soma histórica dos lotes exibidos);
   "Saldo em Estoque"/"Total de Unidades" contam o estoque físico da grade.
4. Consignado (`createConsignacao`) herda o estoque físico no cálculo do
   custo unitário (select ganhou as colunas de grade).
5. Testes novos (caso real da bicicleta VIX e da POLITRIZ esgotada).
**Fora do escopo / proibido (dados, só o dono corrige):** o preço podre do
Mini Localizador (SQL de correção entregue no chat) e os 15 produtos sem
custo (lista já entregue) — dados de negócio, nunca inventados pelo código.
**Regras fixas:** nenhuma além da DIR-5 a DIR-19.
**Status:** EM VIGOR — código, testes (460/460, 3 novos) e build passam;
aguarda conferência do dono no Preview e autorização pra publicar o pacote
DIR-18+19+20.

---

## DIR-19 — Acerto do consignado por unidade, regra de mercado

**Emitida por:** dono, decisão direta depois do achado da DIR-18 ("deixe
igual é no mercado, de maneira sênior, e atualiza o nosso documento
oficial").
**Data:** 30/08/2026.
**Objetivo:** `createConsignacao.js` usava `cost_price` cru (custo do LOTE
inteiro) como valor de acerto de UMA peça consignada — lojista debitado
pelo lote inteiro por cada peça vendida (POLITRIZ: R$ 2.296 em vez de
R$ 255). Corrigir pela regra padrão do mercado de consignação: acerto POR
UNIDADE, na ordem atacado (`selling_price_wholesale`) → custo unitário da
casa → preço de catálogo como último recurso (nunca sai de graça).
**Escopo autorizado:** `api/_lib/custoProduto.js` (espelho servidor da
DIR-18 + `acertoConsignadoUnitario`); `createConsignacao.js` usa a regra
nova; seção **6-D** nova no `DOCUMENTO-OFICIAL-PLANO-CARREIRA.md`
registrando a regra oficial; teste `tests/acertoConsignado.test.mjs`.
**Fora do escopo / proibido:** o motor de liquidação (`consignadoSettle.js`)
e a aprovação (`manageConsignacao.js`) não mudam — eles só repassam o
`custo_unitario` gravado no pedido, que agora nasce certo. Consignações JÁ
criadas com valor inflado (se existirem) não foram tocadas — precisa
conferir no banco antes (consulta entregue ao dono no chat).
**Regras fixas:** nenhuma além da DIR-5 a DIR-18.
**Status:** EM VIGOR — código, testes (457/457, 6 novos) e build passam;
aguarda conferência do dono e autorização pra publicar junto com a DIR-18.

---

## DIR-18 — cost_price interpretado de duas formas contraditórias + produtos sem custo

**Emitida por:** dono, depois de ver "Custo do produto: R$ 0,00" no painel de
lucro diário e afirmar a regra de negócio: "eu JAMAIS posso ter o custo do
produto zerado — a importação da planilha já traz o CUSTO TOTAL". Diagnóstico
confirmado com consultas diretas dele ao banco: 15 dos 302 produtos ativos
sem custo nenhum, e produtos com custo de lote sendo tratado como unitário.
**Data:** 30/08/2026.
**Objetivo:** o campo `products.cost_price` é, por semântica oficial (planilha
de importação, `bulkImportProducts.js`, `RegisterBatches.jsx`), o custo TOTAL
do lote. A maior parte do sistema sempre tratou certo (divide pelas unidades
pra achar o unitário), mas 6 telas multiplicavam pela quantidade como se
fosse unitário — origem do "Valor Investido em Estoque: R$ 50 milhões"
(impossível: o valor de VENDA do mesmo estoque era R$ 4,9 milhões). Além
disso, 15 produtos entraram sem custo pelos formulários manuais (a planilha
sempre traz), zerando o "Custo do produto" no painel de lucro e inflando a
margem.
**Escopo autorizado:**
1. Regra única em `src/lib/custoProduto.js` (`custoUnitario`,
   `custoEstoqueRestante`), com teste próprio calibrado com dados reais de
   produção.
2. Correção das 6 leituras erradas: `CrmClientesTab.jsx` (valorEstoque),
   `BalancoGeralTab.jsx` e `RentabilidadeOperacao.jsx` (valor investido =
   soma dos custos de lote, sem multiplicar), `DailyReportView.jsx` e
   `DailyReportPDF.jsx` (custo da venda = unitário × qtd vendida),
   `PainelLucroDiario.jsx` (passa a reusar a lib, mesma conta).
3. Correção de escrita: `gerarProdutosDoLote.js` gravava o custo UNITÁRIO
   em registro com qtd > 1 — passa a gravar unitário × qtd (custo do lote),
   consistente com a planilha.
4. Trava "jamais custo zerado" nos formulários de cadastro manual
   (`CreateCatalogProduct.jsx`, `AddCatalogProduct.jsx`): salvar sem custo
   > 0 é recusado com mensagem clara.
**Fora do escopo / proibido (flagged, NÃO corrigido — mexe em dinheiro,
precisa de diretiva própria):** `api/functions/createConsignacao.js:97` usa
`cost_price` (custo do LOTE) como `custo_unitario` da peça consignada — num
lote multi-unidade, o lojista consignado é debitado pelo lote inteiro por
CADA peça. Bug real de cobrança; não foi tocado nesta rodada porque altera
fluxo de dinheiro e o valor certo a cobrar é decisão do dono.
Os 15 produtos sem custo também NÃO foram preenchidos — os valores reais só
o dono tem (planilha de origem); a lista exata já foi entregue no chat.
**Regras fixas:** nenhuma além da DIR-5 a DIR-17.
**Status:** EM VIGOR — código, testes (451/451, 8 novos) e build passam;
falta o dono conferir no Preview (Valor Investido em Estoque deve cair dos
R$ 50 milhões pra um valor realista) e autorizar a publicação.

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
