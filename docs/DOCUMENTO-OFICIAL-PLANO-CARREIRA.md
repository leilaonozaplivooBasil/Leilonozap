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

### 5.2 Carteira migrada vence a árvore (executivo)
Se a pessoa tem `executive_owner_id` definido (carteira migrada), esse executivo
vence a travessia normal da árvore — para ela e para a sub-rede dela.
Ordem: carteira própria → a própria pessoa é executiva → sobe pra quem indicou →
executivo raiz (CEO).

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