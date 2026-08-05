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

1. Decidir o destino dos 407 registros indevidos (estornar, marcar como
   inválidos ou preservar como histórico de teste).
2. Reconciliar a divergência de R$ 205,89.
3. Definir se `total_commissions_generated` passa a ser alimentado como trilha
   independente de auditoria.
4. Religar a automação **somente após** validação da trava de `kind` em ambiente
   controlado.

> ⚠️ Nenhum dos itens acima pode ser executado sem autorização explícita do dono,
> conforme `docs/VERDADE.md`.