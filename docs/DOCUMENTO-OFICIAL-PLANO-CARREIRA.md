# 📕 DOCUMENTO OFICIAL — PLANO DE CARREIRA E COMISSÕES · LEILÃO NOZAP

> ⚠️ **Documento soberano: [`VERDADE.md`](VERDADE.md). Em caso de conflito, ele vence.**
> Este documento é o **2º** na hierarquia e tem autoridade **exclusiva** em comissão,
> percentual e hierarquia de cargos.

> **STATUS: FONTE DE VERDADE ABSOLUTA · CONSULTA OBRIGATÓRIA**
>
> Fonte: `Leilao-NoZap-apresentacao-Oficial2.pdf` — apresentação oficial de negócio
> entregue pelo dono (Gabriel Santanna) em **04/08/2026**.
>
> ## ⚠️ REGRA DE USO DESTE DOCUMENTO
>
> **SEMPRE que houver qualquer dúvida sobre percentual, cargo, hierarquia ou quem
> recebe o quê — LER ESTE ARQUIVO PRIMEIRO, ANTES de tocar em qualquer código.**
>
> Se alguém (inclusive o próprio dono, de memória, numa conversa) falar um
> percentual **diferente** do que está aqui: **este documento vence.** O certo é
> apontar a divergência e pedir confirmação — NUNCA alterar o motor de comissão
> com base em número falado de cabeça.
>
> Aconteceu em 04/08/2026: foi dito "licenciado 15%" numa conversa; o documento
> oficial diz **13%** (15% é o Parceiro). O código estava certo e não foi mexido.
>
> Só se altera este documento com autorização EXPLÍCITA do dono + nova versão
> oficial da apresentação.

---

## 1. TABELA OFICIAL DE COMISSÃO DIRETA (venda direta por cargo)

| # | Cargo | Investimento de entrada | **% venda direta** | Nome comercial |
|---|---|---|---|---|
| 1 | **Influenciador** | **Gratuito** (R$ 0) | **5%** | — |
| 2 | **Vendedor** | R$ 1.497 (100% em produtos) | **10%** | — |
| 3 | **Licenciado** | R$ 5.000 (em produtos) | **13%** | Loja Inicial |
| 4 | **Parceiro** | R$ 20.000 (em produtos) | **15%** | Loja Start |
| 5 | **Ponto de Retirada** | R$ 50.000 (em produtos) | **16%** | Loja Profissional |
| 6 | **Loja Física** | R$ 350.000 (em produtos) | **19%** | Loja Líder |
| 7 | **Distribuidor** | R$ 4.000.000 (em produtos) | **20%** | Loja Distribuidor |

**Faixa oficial divulgada ao mercado: 13% a 20%** (posicionamento dos planos pagos
de loja — acima de afiliados ML 5–12%, Shopee 3–12%, Amazon 1–10%, Magalu 10–16%).

### Ganho mensal projetado (base R$ 20.000/mês por loja)
| Cargo | % | Ganho/mês |
|---|---|---|
| Loja Inicial (Licenciado) | 13% | R$ 2.600 |
| Loja Start (Parceiro) | 15% | R$ 3.000 |
| Loja Profissional (Ponto de Retirada) | 16% | R$ 3.200 |
| Loja Líder (Loja Física) | 19% | R$ 3.800 |
| Loja Distribuidor | 20% | R$ 4.000 |

---

## 2. O EXECUTIVO RECEBE SOBRE A CADEIA — REGRA DESTACADA PELO DONO

> "**É só você lembrar que o executivo recebe sobre a cadeia.**" — Gabriel, 04/08/2026

O **Executivo de Conta** NÃO é um cargo de compra/venda da tabela acima. Ele é
**estrutura de suporte**: cada cargo pago tem "suporte de um executivo dedicado"
(consta em Vendedor, Licenciado, Parceiro e Ponto de Retirada na apresentação).

Como ele é remunerado:
- **1% sobre a venda**, pago **por fora** da cadeia telescópica de 20%.
- Ele recebe **sobre a cadeia que ele atende** — ou seja, sobre as vendas de toda
  a estrutura sob a responsabilidade dele, não sobre uma venda isolada dele.
- Resolução de QUAL executivo recebe: ver seção 5 (regra da carteira migrada).

---

## 3. HIERARQUIA — QUEM CADASTRA QUEM

Regra estrutural (não é opcional — o cadastro tem que respeitar):

```
Distribuidor            → cadastra TODA a hierarquia abaixo
   └─ Loja Física       → cadastra Ponto de Retirada, Parceiro, Licenciado, Vendedor, Influenciador
        └─ Ponto de Retirada → cadastra Parceiro, Licenciado, Vendedor, Influenciador
             └─ Parceiro      → cadastra Licenciado, Vendedor, Influenciador
                  └─ Licenciado    → cadastra Vendedor e Influenciador
                       └─ Vendedor      → cadastra APENAS Influenciador
                            └─ Influenciador → NÃO cadastra ninguém (ponta da rede)
```

Restrições explícitas da apresentação:
- **Influenciador NÃO cadastra outros membros.** É cadastrado por Vendedor ou Licenciado.
- **Vendedor NÃO se autocadastra.** É cadastrado por um Licenciado (ou superior).
- **Licenciado** é cadastrado por Parceiro ou superior.
- **Parceiro** é cadastrado por Ponto de Retirada ou superior.
- **Ponto de Retirada** é cadastrado por Loja Física ou superior.
- **Loja Física** é cadastrada por Distribuidor.
- **Distribuidor** é o nível máximo da hierarquia regional.

**Rebate:** todo cargo pago recebe rebate sobre as vendas da rede abaixo dele.
Parceiro para cima: rebate sobre **toda** a rede abaixo.

---

## 4. COMO O REBATE FUNCIONA NA PRÁTICA (cadeia telescópica — 20%)

A comissão de rede é **telescópica**, não cumulativa cega. O teto da cadeia é
**20%** (o percentual do topo da tabela, Distribuidor).

Funcionamento:
1. Quem vendeu recebe o **percentual cheio do próprio cargo** (venda direta).
2. Cada pessoa acima na linha recebe a **diferença** entre o percentual dela e o
   piso já pago abaixo (o rebate).
3. Quando a soma atinge 20%, a cadeia fecha — ninguém mais recebe.
4. Sobrou percentual sem dono (linha curta / sem rede)? **Vai para a empresa**
   (Site Oficial), registrado como `empresa_rollup`.

**Exemplo real** — venda feita por um **Loja Física (19%)** que está sob um
**Distribuidor (20%)**:
- Loja Física: 19% (venda direta)
- Distribuidor: 20% − 19% = **1%** (rebate)
- Total da cadeia: 20% ✅ fechado

**Exemplo 2** — venda feita por um **Influenciador (5%)** sob Vendedor (10%) sob
Licenciado (13%) sob Distribuidor (20%):
- Influenciador: 5% · Vendedor: +5% · Licenciado: +3% · Distribuidor: +7% = 20% ✅

---

## 5. REGRAS DE ATRIBUIÇÃO — QUEM É O "VENDEDOR" DA VENDA

### 5.1 Venda pessoal (confirmada pelo dono em 04/08/2026)
Quem tem **qualquer cargo de rede** é **SEMPRE o vendedor da própria compra** —
logado, deslogado, ou comprando pelo link de outra pessoa.

> "Comprei na minha loja, automaticamente eu ganho."

Ordem de resolução no checkout (PIX e cartão):
1. **Comprador tem cargo de rede → ele é o vendedor** (venda pessoal)
2. Senão → dono do link `?ref=`
3. Senão → o padrinho (`referred_by_id`)
4. Vendedor tem que **existir** no banco — senão a venda fica sem vendedor
   (nunca paga conta fantasma)

### 5.2 O EXECUTIVO É DESIGNADO À MÃO — A DESIGNAÇÃO VENCE A ÁRVORE
**(regra oficial esclarecida pelo dono em 05/08/2026)**

O executivo de conta **não é derivado da árvore**. Ele é uma **designação
administrativa editável**: o admin abre a ficha da pessoa e escolhe/troca o
executivo daquela linha (tela de rede → botão **Editar** → campo
*Estrutura de Negócio (1% do Executivo)*, que exibe `Ribeiro — fixado`).

Como isso nasceu (palavras do dono):
> "O Luiz Santanna cadastrou todo mundo e teve que ir soltando. A linha de Bangu
> é uma linha que vai precisar de um executivo e ele destinou o Ribeiro. O
> sistema permite que eu escolha o executivo. **Então isso não é uma regra** — a
> regra é que o sistema permite o Ribeiro ser executivo de uma linha que nasceu
> da conta oficial. Assim como vamos poder mover outros, tirar do Luiz Santanna
> e botar para outros."

Portanto:
- ✅ **`executive_owner_id` gravado é a FONTE DA VERDADE.** Vence a árvore, para a
  pessoa e para toda a sub-rede dela.
- ✅ Uma linha que **nasceu da Conta Oficial pode ter executivo diferente do
  Luiz Santanna**. Isso é o recurso funcionando, não um defeito.
- ✅ A designação é **transferível a qualquer momento** pelo admin. Mover o
  executivo de uma linha é operação **prevista e legítima**.
- ⚠️ **Unicidade:** uma pessoa/linha tem **um** executivo por vez.

Ordem de resolução no motor: designação própria → a própria pessoa é executiva →
sobe pra quem indicou → executivo raiz (CEO).

#### ⛔ NÃO EXISTE a regra "quem vem da Conta Oficial é do Luiz Santanna"
Essa inferência é **falsa** e nunca foi regra de negócio.

🚨 **`auditarDesalinhamentoExecutivo` está construído sobre essa premissa falsa.**
Ele compara a designação gravada contra o que a *árvore* sugere e chama de
"desalinhado" o que na verdade está **certo**. Hoje ele acusa o
**DISTRIBUIDOR BANGU** (`Ribeiro`, correto e fixado pelo dono) e recomenda
`Ribeiro → LUIZ SANTANNA`.

> ⛔ **NUNCA rodar `corrigirExecutivoEstrutura` com base na saída desse auditor.**
> Aplicar a sugestão dele **desfaz a designação oficial da cadeia Bangu.**
> O motor de comissão (`acertarComissaoVenda` / `resolveExecutivo.js`) está
> **correto** — respeita a designação gravada. O defeito é só do auditor.

### 5.3 Trainee
**Trainee é papel de mentoria — NÃO tem percentual de venda direta.** Fica fora da
lista de cargos de rede para efeito de venda pessoal.

---

## 6. OS 10% DE GOVERNANÇA (topo institucional)

Além dos 20% da cadeia, há **10%** distribuídos para a estrutura institucional,
totalizando **30%** por venda de catálogo:

| Pool | % |
|---|---|
| CEO | 3,0% |
| Livoo Live | 2,0% |
| Embaixador | 1,0% |
| Conselheiro | 1,0% |
| Fundador | 1,0% |
| Diretoria Executiva | 0,5% |
| Diretoria de Operação | 0,5% |
| **Executivo de Conta** (sobre a cadeia — seção 2) | **1,0%** |
| **TOTAL TOPO** | **10,0%** |

Pool com vários donos: rateia em centavos inteiros (maior resto), com rotação
estável pela venda. Pool sem nenhum dono ativo: o percentual volta para a empresa.

**FÓRMULA OFICIAL: 30% = 20% cadeia telescópica + 10% topo institucional.**

---

## 6-A. COMISSÃO DE LEILÃO — REGRA OFICIAL (confirmada pelo dono em 04/08/2026)

⚠️ **O LEILÃO NÃO SEGUE A REGRA DA LOJA VIRTUAL.** São modelos diferentes.
Não aplicar aqui os 30% / cadeia telescópica / pools do topo.

| Item | Regra oficial do leilão |
|---|---|
| Percentual | **5%** do valor do arremate (era 3% até 04/08/2026) |
| Quem recebe | **UMA pessoa** — quem indicou o arrematante (`referred_by_id`) |
| Cadeia | ❌ **NÃO TEM.** Sem telescópio, sem rebate, sem pool de topo, sem executivo |
| Restante | Fica **integralmente com a empresa** (não é distribuído) |
| Base de cálculo | **SÓ o valor do produto** (`current_price`). **Frete NUNCA comissiona** |
| Quando paga | **NO MARTELO** |
| Não comissiona | Planos de investimento (`is_investment_plan`) |

### Por que paga no martelo (e por que está correto)
O arrematante **deposita o saldo antes** de dar lance, e o valor é **reservado no
lance** (`saldo_reservado`). Quando o martelo bate, o dinheiro **já está no caixa** —
o martelo **já É o pagamento**. Não existe "esperar pagar depois".

> ⛔ **NÃO MOVER este gatilho para o fluxo de pagamento.** Decisão explícita do dono.

### Onde vive no código
| Papel | Arquivo | Estado |
|---|---|---|
| **Motor ativo** — paga os 5% no martelo | `api/_lib/finalizeAuctionCore.js` | ✅ VIVO |
| Movimenta o saldo do arremate (sem comissão) | `base44/functions/settleAuctionBalance/entry.ts` | ✅ VIVO |
| Motor legado de 5% | `base44/functions/processAuctionInfluencerCommission/entry.ts` | ⚠️ INATIVO |

### 🚨 ALERTA PERMANENTE — RISCO DE PAGAMENTO DUPLO
`processAuctionInfluencerCommission` é chamado por `payOrderWithWallet` e **grava no
store interno do Base44, não no Supabase de produção** — por isso está inerte
(última execução real: 19/01/2026, R$ 0,06, antes da migração).

**Os dois motores não se conhecem.** A trava de idempotência do motor legado procura
um `commission_record` que o `finalizeAuctionCore` **nunca cria**.

> ⛔ **Reativar o motor legado sem antes remover a chamada em `payOrderWithWallet`
> faz o leilão pagar 10% em vez de 5%.**

---

## 6-B. ADESÃO COMISSIONA — MAS POR MOTOR PRÓPRIO (verificado em 05/08/2026)

**Dúvida levantada:** o documento diz que adesão paga comissão, mas o motor de
catálogo (`acertarComissaoVenda`) lista `adesao` e `seller_adhesion` em
`NAO_E_VENDA` e as barra. Parecia contradição. **Não é.**

Verificado linha por linha em `api/functions/mpWebhook.js`:

| `kind` | Função que trata | Comissão paga | Regra |
|---|---|---|---|
| `adesao` | `activateAdesao()` | ✅ **20% em dinheiro** ao vendedor que indicou | `role_in_sale: 'bonus_adesao'` |
| `seller_adhesion` | `creditSellerAdhesion()` | ✅ **cadeia telescópica, teto 20%** para o `referred_by_id` | via `payDirectCommissions()` |

✅ **Adesão comissiona — como manda o documento.** Ela só não passa pelo motor de
catálogo porque **tem regra própria (20%)**, diferente da venda de produto (30%).

> ⛔ **NUNCA remover `adesao`/`seller_adhesion` do `NAO_E_VENDA`.** Essa trava é a
> proteção contra **PAGAMENTO DUPLO**: a adesão já foi paga a 20% pelo webhook;
> se o motor de catálogo também a processasse, pagaria 30% por cima.

### ⚠️ EXISTEM DUAS TABELAS DE COMISSÃO — atenção em toda auditoria

| Tabela | Quem grava | O que contém |
|---|---|---|
| `commission_records` | motor Deno (`acertarComissaoVenda`) | venda de **produto** (30%) |
| `commission_ledger` | motor Node/Vercel (`mpWebhook`, `commissions.js`, `storeFulfill.js`) | **adesão** (20%), bônus e cadeia direta |

### 📊 ESTADO REAL DA `commission_ledger` (medido em 05/08/2026)

Auditado via `auditarCommissionLedger` (função **somente-leitura**):

> **A tabela existe e está VAZIA — 0 registros, R$ 0,00.**

Duas conclusões diretas:

1. ✅ **Os números da auditoria anterior estão COMPLETOS.** Não havia comissão
   escondida na segunda tabela — os R$ 60,22 são o total real do sistema.
2. ⚠️ **O caminho de comissão da adesão NUNCA RODOU em produção.** O código
   existe e está correto na leitura, mas **jamais foi executado com dinheiro
   real** — logo, está **NÃO VALIDADO na prática**. A primeira adesão paga de
   verdade será o primeiro teste real desse motor. **Conferir manualmente a
   comissão da primeira adesão** antes de confiar no fluxo.

🚨 **Auditoria que olha só `commission_records` é CEGA para adesão e bônus.**
Foi exatamente o que aconteceu na auditoria de 04–05/08/2026: as comissões de
adesão não apareceram porque vivem na outra tabela. Toda auditoria financeira
daqui pra frente **tem que ler as duas**.

---

## 6-C. VENDA NO PDV — REGRA OFICIAL "QUEM VENDE RECEBE" (dono, 18/08/2026)

O PDV (Tirar Pedido) atende **duas vendas diferentes na mesma tela**. Confundir as
duas foi o que travou a operação em 18/08/2026. A regra abaixo separa as duas de
forma definitiva.

### O princípio: uma comissão NÃO paga duas coisas

O antigo "rebate da casa" misturava dois pagamentos que são independentes:

| Pagamento | O que remunera | Quem recebe | Existe sempre? |
|---|---|---|---|
| **Comissão de venda** | o esforço comercial (atendeu, fechou o pedido) | **quem tirou o pedido**, pela árvore genealógica dele + topo 10% | ✅ **sempre** |
| **Margem da mercadoria** | o capital (comprou o lote, guardou, correu o risco) | **o dono da peça** | ❌ só se a peça saiu do **estoque próprio** |
| **% da licença** | o benefício de quem é da rede e compra pra si | o **comprador identificado** da rede | ❌ só quando há comprador da rede identificado |

No balcão de um distribuidor com estoque próprio essas figuras são a **mesma
pessoa** — por isso a regra antiga parecia funcionar. Quando o PDV foi aberto para
a rede toda e o **estoque central** entrou na jogada, elas se separaram.

### As três situações, resolvidas sem exceção

| Situação | Resultado |
|---|---|
| Recreio compra no balcão de Bangu, peça do **estoque de Bangu** | Recreio: % da licença · **Bangu: comissão de venda + margem da mercadoria dele** |
| Recreio compra no balcão de Bangu, peça do **estoque central** | Recreio: % da licença · **Bangu: comissão de venda** (atendeu, mas não bancou a peça) |
| Vendedor de rua vende pra **cliente final**, peça do central | **Comissão de venda sobe pela árvore do vendedor** — é venda de loja virtual |

✅ **A regra do balcão do distribuidor continua de pé:** quem compra na porta de um
distribuidor faz esse distribuidor ganhar. Ela só deixou de depender de um dado
errado (ver abaixo) e passou a depender do que a pessoa **fez**.

💰 **Não encarece:** balcão pagava teto 20% + topo 10% = 30%. A régua da loja
virtual paga cadeia 20% + topo 10% = 30%. Mesmo custo, endereço certo.

### ⛔ O MÉTODO DE PAGAMENTO NUNCA DECIDE A RÉGUA DE COMISSÃO

Dinheiro, PIX, cartão ou **saldo** definem apenas **por onde o dinheiro chegou** —
nunca quem recebe comissão.

**Caso oficial (Elenice Lima, 18/08/2026):** vendedora de rua vendeu pela loja
virtual dela, o cliente pagou **em dinheiro na mão dela**, ela **depositou e comprou
saldo**, e pagou o pedido com esse saldo. O dinheiro do cliente entrou de verdade na
plataforma; o saldo foi só o canal. **É venda de loja virtual — comissão pela árvore
dela.** Se o cliente tivesse passado o cartão no site, o resultado econômico seria
idêntico.

### 🚨 `products.distribuidor_id` NÃO É "DONO DO ESTOQUE"

O estoque **central** está gravado com o id de um distribuidor (medido em
18/08/2026: **933 de 1.000** produtos com estoque apontando para `DISTRIBUIDOR
BANGU`, sendo mercadoria central). Portanto:

> ⛔ **NUNCA usar `products.distribuidor_id` para decidir comissão, rebate ou
> permissão de venda.** Dono de mercadoria é `store_inventory` (estoque próprio,
> `origem='comprado'|'consignado'`) — é o que a baixa (`api/_lib/baixaEstoque.js`)
> e o repasse (`api/_lib/repasseEstoqueProprio.js`) já usam.

**Trava removida em 18/08/2026** em `api/functions/createPdvOrder.js`: o pedido era
bloqueado com *"Este produto pertence a outro distribuidor"* quando o
`distribuidor_id` diferia de quem operava. Como o estoque central carrega o id de um
distribuidor, **100% dos produtos travavam** para todo vendedor de rua — ele recebia
o dinheiro do cliente e era barrado no último clique.

### O que protege o dinheiro (continua de pé, não foi tocado)

1. **Débito condicional no banco:** o pedido em saldo só fecha se a carteira de quem
   opera cobrir o valor — dois pedidos simultâneos nunca deixam saldo negativo.
2. **Trava do consignado:** peça consignada sem cobertura de saldo não fecha venda.
3. **Idempotência da comissão:** `sale_id` já com `commission_records` não paga de novo.
4. **Crédito conferido:** comissão que não cai no saldo fica `pending`, nunca silenciosa.

### Onde vive no código

| Papel | Arquivo |
|---|---|
| Decide quem é o vendedor da venda de PDV | `api/functions/createPdvOrder.js` |
| Comissão pela árvore (motor único da loja) | `api/_lib/storeFulfill.js` → `api/_lib/arvoreOficial.js` |
| Regra do balcão (comprador da rede identificado) | `api/_lib/pdvBalcao.js` |
| Mesma decisão no caminho PIX (webhook) | `api/_lib/pdvSettle.js` |
| Dono real da mercadoria + margem | `api/_lib/baixaEstoque.js` · `api/_lib/repasseEstoqueProprio.js` |

### ⏭️ Pendências conhecidas (NÃO alteradas — exigem autorização)

1. **Comprador da rede identificado levando peça do estoque central:** hoje o balcão
   ainda fica com o resto do teto como rebate de casa, mesmo sem ser dono da peça.
   Pelo princípio acima, deveria receber comissão de venda pela árvore dele.
2. **Organização dos dados de estoque:** separar estoque central de estoque próprio
   do distribuidor no cadastro dos produtos.
3. **Admin operando o PDV:** continua atribuindo a venda ao `distribuidor_id` do
   produto (decisão anterior, preservada) — que hoje é dado impreciso.

---

## 7. OUTRAS COMISSÕES CITADAS NA APRESENTAÇÃO

- **Venda de licença** (Distribuidor sobre licenciados da região): **7%**
  → 1.000 licenças × R$ 2.500 × 7% = R$ 175.000
- **Compradores do App** (comissão passiva do Distribuidor): **3%**
  → 1.000 × R$ 497 × 3% = R$ 14.910/mês

---

## 8. MODELO DE NEGÓCIO (contexto)

Dois modelos de venda, ambos com entrega no mesmo dia em todo o RJ (Lalamove):
1. **Produtos devolvidos** — compra até 80% off da fábrica, revende até 60% off do
   mercado. Margem até 100%. Pedido até **19h** → entrega no mesmo dia.
2. **Direto de fábrica** — 6.500+ produtos novos, sem intermediário.
   Pedido até **11h** → entrega no mesmo dia.

**Influenciador / Livoo Creators & Lives:** cadastro 100% gratuito, 5% por venda,
divulga por lives/stories/redes, acesso à plataforma Livoo Live Shop.

---

## 9. ONDE ESSAS REGRAS VIVEM NO CÓDIGO

| Regra | Arquivo |
|---|---|
| Tabela `NIVEIS` (5/10/13/15/16/19/20%) + pools do topo | `base44/functions/acertarComissaoVenda/entry.ts` |
| Pools do topo (Node/Vercel) | `api/_lib/topPool.js` |
| Resolução do executivo (fonte única) | `api/_lib/resolveExecutivo.js` |
| Espelho da regra do executivo em Deno | `base44/functions/acertarComissaoVenda/entry.ts` |
| Cadeia / rebate no fechamento da venda | `api/_lib/commissions.js` |
| Atribuição de vendedor — venda pessoal (PIX) | `api/functions/createMPPix.js` |
| Atribuição de vendedor — venda pessoal (cartão) | `api/functions/createMPCatalogCardCheckout.js` |
| Catálogo de cargos no frontend | `src/lib/careerLevels.js` |

⚠️ **A regra do executivo está ESPELHADA em dois runtimes** (Node/Vercel e Deno),
que não compartilham import. Mudou a regra? **Mude nos dois, sempre.**

---

## 10. VALIDAÇÃO EM 04/08/2026

Confrontada a apresentação oficial contra o motor de comissão em produção:

| Cargo | Documento oficial | Sistema | Status |
|---|---|---|---|
| Influenciador | 5% | 5% | ✅ |
| Vendedor | 10% | 10% | ✅ |
| Licenciado | 13% | 13% | ✅ |
| Parceiro | 15% | 15% | ✅ |
| Ponto de Retirada | 16% | 16% | ✅ |
| Loja Física | 19% | 19% | ✅ |
| Distribuidor | 20% | 20% | ✅ |
| Executivo (sobre a cadeia) | 1% | 1% | ✅ |
| Teto da cadeia | 20% | 20% | ✅ |
| Topo institucional | 10% | 10% | ✅ |

**Resultado: motor de comissão 100% alinhado ao documento oficial. Zero alteração
necessária.**

---

## 11. BLOCO FINANCEIRO 1 — 04/08/2026

Duas correções autorizadas pelo dono e aplicadas:

**A) Trava anti-contágio no recálculo em lote** (`acertarComissaoVenda`)
O modo lote filtrava só por status, então **depósito de carteira, crédito de
passaporte, frete de vendedor, adesão e plano de expansão eram tratados como venda
de produto** e recebiam 30% de comissão indevida. Exposição medida: **R$ 393,48**.
Agora só entra `kind='loja'` ou `kind` nulo (vendas legadas), com dupla barreira
(banco + código).

Prova (dry_run após a correção): **20 → 12 vendas**, todas produto real. Nenhum
depósito, passaporte ou frete na lista. Total de ajuste caiu para **R$ 0,38**
(centavos de arredondamento em 2 vendas legítimas).

**B) Leilão 3% → 5%** — ver seção 6-A.

Investigação prévia obrigatória (só leitura) provou que **não existe pagamento duplo
em produção**: o caminho real de pagamento de arremate hoje é
`settleAuctionBalance`, que **não paga comissão nenhuma** — só movimenta saldo.
Único motor de comissão de leilão ativo: `finalizeAuctionCore` (martelo).

**Regra transversal reafirmada: FRETE NUNCA COMISSIONA** — nem no leilão, nem na
Loja Virtual. Verificado na Loja Virtual: `frete_vazou_para_base: "nao"` em todas as
vendas auditadas.