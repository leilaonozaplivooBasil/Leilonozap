# 📍 MARCO OFICIAL — AGOSTO / 2026

> **Natureza deste documento:** retrato de origem. Registra o estado dos números
> financeiros no momento do pré-lançamento oficial, junto com as pendências
> conhecidas e ainda **não resolvidas**.
>
> **Hierarquia:** subordinado a `docs/VERDADE.md`. Em qualquer conflito,
> `VERDADE.md` prevalece.
>
> **Data de redação:** 04/08/2026
> **Origem dos números:** função `auditarFase1Marco` (100% leitura, produção Supabase)

---

## 1. DEFINIÇÃO DO MARCO

| Item | Definição |
|---|---|
| **Pré-lançamento oficial** | **01/08/2026** |
| **Antes de 01/08/2026** | 🧪 **TESTE.** Sem valor financeiro. Não é receita, não é passivo, não é obrigação com ninguém. |
| **De 01/08/2026 em diante** | 💰 Dinheiro real. Vale como operação. |

**Critério técnico de "dinheiro real":** venda em `catalog_sales` com status
pago (`paid` / `shipped` / `delivered`) **e** com rastro de gateway
(`mp_payment_id`, `stripe_payment_intent` ou `stripe_session_id`).

Tudo que não atende os dois critérios ao mesmo tempo é considerado teste.

---

## 2. NÚMEROS MEDIDOS — RETRATO DE ORIGEM

Estes valores são o **retrato**, não uma validação. Foram medidos, não auditados
quanto ao mérito da regra que os gerou.

| Medida | Valor |
|---|---|
| Comissões geradas em agosto (venda com dinheiro real) | **R$ 355,12** |
| Saldos efetivamente nas contas | **R$ 149,23** |
| **Divergência** | **R$ 205,89** |
| Campo `total_commissions_generated` | **R$ 0,00 em 52 contas** (nunca alimentado) |
| Comissões "fora da loja" (sale_id sem venda na loja) | 275 registros |

---

## 3. ⚠️ PENDÊNCIA ABERTA 1 — DIVERGÊNCIA DE R$ 205,89

**Status: ABERTA. Não resolvida.**

Há uma diferença de **R$ 205,89** entre o que os registros de comissão dizem que
foi gerado em agosto e o que está de fato nos saldos das contas.

- **R$ 215,24** dessa diferença está concentrada na conta **Leilão NoZap – Site Oficial**.
- A conta Site Oficial é a casa (rollup institucional), não um beneficiário externo.
- **Agravante:** o campo histórico `total_commissions_generated` está **vazio/nulo em
  100% das contas**. Ele deveria ser a trilha independente de conferência
  ("nunca diminui"). Estando vazio, **não existe segunda fonte** para cruzar com
  `commission_records`.

**Consequência:** a conferência dos saldos hoje depende de uma única tabela.
Não há dupla checagem.

**O que falta:** decidir se a divergência é resíduo de teste pré-01/08, saque,
zeramento manual ou crédito nunca aplicado. **Não foi decidido. Não foi tocado.**

---

## 4. 🔴 PENDÊNCIA ABERTA 2 — COMISSÃO INDEVIDA SOBRE DEPÓSITO E PASSAPORTE

**Status: CAUSA IDENTIFICADA. REGISTROS NÃO CORRIGIDOS.**

### 4.1 O que aconteceu

Comissão foi paga sobre itens que, pela regra oficial
(`docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md`), **nunca** deveriam comissionar.

| Tipo de item | Registros | Valor indevido | Vendas |
|---|---|---|---|
| 🔴 `wallet_deposit` (depósito de carteira) | 381 | **R$ 265,50** | 16 |
| 🔴 `passaporte` | 26 | **R$ 30,00** | 1 |
| **TOTAL** | **407** | **R$ 295,50** | 17 |

**Concentração temporal:** **100% em agosto/2026.** Zero registros em junho e
julho. O problema nasceu e se encerrou dentro de agosto.

**Frete:** ✅ verificado, **não comissionou** (zero registros).

### 4.2 Contas beneficiadas indevidamente

| Conta | Registros | Valor |
|---|---|---|
| Leilão NoZap – Site Oficial | 17 | **R$ 206,80** |
| LUIZ SANTANNA | 78 | R$ 35,63 |
| LIVOO LIVE | 68 | R$ 23,37 |
| LUIS FRANCISCO | 17 | R$ 9,85 |
| LUCIANO PINHEIRO | 66 | R$ 6,12 |
| DISTRIBUIDOR RECREIO | 40 | R$ 3,65 |
| JOSÉ AMANCIO | 45 | R$ 3,64 |
| FLAVIO MONTEIRO | 42 | R$ 3,62 |

**Exposição real a terceiros ≈ R$ 88,70.**
Os **R$ 206,80** restantes ficaram na conta Site Oficial (a casa) e não
representam saída de caixa.

### 4.3 Causa-raiz

**Arquivo:** `base44/functions/processCatalogCommission/entry.ts`

É o único motor que grava em `commission_records`. Antes da correção, ele
validava **apenas** `sale.status !== 'paid'` e **nunca lia o campo `sale.kind`**.
Resultado: qualquer registro de `catalog_sales` que virasse `paid` — inclusive
depósito e passaporte — recebia a distribuição completa de 26% + rollup.

O motor novo, `api/functions/mpWebhook.js`, **já fazia a coisa certa** e ignorava
depósito explicitamente. A trava existia, mas **nunca foi portada** para o motor
antigo. O furo não foi lógica errada — foi uma trava ausente.

### 4.4 Estado do gatilho

A automação de entidade **"Process Catalog Commission on Paid"**
(`CatalogSale` → `update` → `processCatalogCommission`) está
**DESLIGADA (`is_active: false`)**.

👉 **O vazamento NÃO está ativo. Não está saindo dinheiro neste momento.**
O risco é de **reincidência** caso a automação seja religada.

### 4.5 O que foi feito e o que NÃO foi

| Ação | Status |
|---|---|
| Trava de `kind` adicionada em `processCatalogCommission` | ✅ **FEITO** (04/08/2026) |
| Registros indevidos existentes (407 / R$ 295,50) | ❌ **NÃO corrigidos — intactos** |
| Saldos das contas beneficiadas | ❌ **NÃO alterados** |
| Automação religada | ❌ **NÃO — permanece desligada** |
| Estorno / recálculo | ❌ **NÃO executado — aguarda autorização do dono** |

---

## 5. 🚫 O QUE ESTE MARCO **NÃO** FAZ

Declaração explícita, para não haver interpretação futura equivocada:

> **Este marco NÃO valida a regra atual de comissão.**

Especificamente, este documento **não**:

1. ❌ Declara que os R$ 355,12 de agosto estão corretos.
2. ❌ Declara que os saldos atuais estão corretos.
3. ❌ Valida a distribuição de 26% como aplicada até aqui.
4. ❌ Encerra a divergência de R$ 205,89.
5. ❌ Regulariza os 407 registros indevidos de R$ 295,50.
6. ❌ Autoriza qualquer exclusão, zeramento ou recálculo de dados.

O marco fixa **apenas a data de corte e o retrato de origem**. O mérito
contábil de cada número segue **em aberto**.

---

## 6. PRÓXIMOS PASSOS (não autorizados ainda)

1. ✅ **RESOLVIDO** — destino dos 407 registros indevidos: **excluídos** na
   ZERAGEM-HISTORICO (seção 7).
2. ✅ **RESOLVIDO** — divergência de R$ 205,89: eliminada na origem, saldos
   recalculados a partir dos registros válidos (seção 7).
3. ✅ **RESOLVIDO** — `total_commissions_generated` passou a ser alimentado.
4. Religar a automação **somente após** validação da trava de `kind` em ambiente
   controlado. ⚠️ **AINDA PENDENTE** — e o motor legado está em quarentena
   permanente, então a automação **não deve** ser religada apontando pra ele.

> ⚠️ Nenhum dos itens acima pode ser executado sem autorização explícita do dono,
> conforme `docs/VERDADE.md`.

---

## 7. ✅ ZERAGEM-HISTORICO — EXECUTADA EM 04/08/2026

**Autorizada explicitamente pelo dono. Modo A+ (expurgo + recálculo).**

### 7.1 O que foi apagado — 9.890 registros / R$ 19.435,70

| Motivo | Registros | Valor |
|---|---|---|
| Motor legado 26% (pré-agosto) | 9.269 | R$ 17.064,97 |
| Órfã — venda-mãe não existe | 214 | R$ 2.075,23 |
| 🔴 Depósito de carteira (agosto) | 381 | R$ 265,50 |
| 🔴 Passaporte (agosto) | 26 | R$ 30,00 |
| **TOTAL EXCLUÍDO** | **9.890** | **R$ 19.435,70** |

Executado em 20 blocos de até 500 registros. Frete: zero registros (nunca
comissionou).

### 7.2 O que ficou — a base limpa

| Medida | Antes | Depois |
|---|---|---|
| Registros de comissão no banco | 10.197 | **307** |
| Valor total | R$ 19.537,40 | **R$ 101,70** |
| Soma dos saldos das contas | R$ 149,23 | **R$ 101,70** |
| Comissão sobre item não-comissionável | R$ 295,50 | **R$ 0,00** |
| `total_commissions_generated` | nulo/zero em 100% | **alimentado (18 contas)** |

**Os 307 registros restantes são 100% venda de produto de agosto/2026.**
Saldo e extrato agora batem exatamente: R$ 101,70 = R$ 101,70.

### 7.3 Por que modo A+ e não "só pré-agosto"

Apagar apenas o pré-agosto e recalcular pela soma bruta de agosto **subiria** os
saldos de R$ 149,23 para R$ 397,20 — porque R$ 295,50 dos R$ 397,20 de agosto
eram os 407 registros de depósito/passaporte. Isso deixaria o banco arrumado
**violando a regra oficial** (comissão só em venda confirmada de produto). O modo
A+ expurga também esse vazamento, então nenhuma conta recebeu centavo que a regra
não autoriza.

### 7.4 Rastro de segurança

- **Retrato pré-exclusão:** função `gravarRetratoAntesZeragem`
  (`parte: RESUMO | ALVO | PRESERVADO`) — capturou os 10.197 registros e os
  saldos das 52 contas antes de qualquer DELETE.
- **Função executora:** `zerarHistoricoPreAgosto` — `dry_run: true` por padrão;
  só apaga com `dry_run: false` explícito.
- **Corte cravado no código:** `2026-08-01`.

### 7.5 O que NÃO foi tocado

`catalog_sales` · `auctions` · `digital_wallets` · `wallet_transactions` ·
percentuais oficiais (30% loja / 5% leilão) · motor `acertarComissaoVenda` ·
quarentena do `processCatalogCommission`.

> ✅ **A partir de 01/08/2026 o banco de comissão está limpo, consistente e em
> conformidade com a regra oficial.** Qualquer divergência daqui pra frente é
> fato novo, não herança.