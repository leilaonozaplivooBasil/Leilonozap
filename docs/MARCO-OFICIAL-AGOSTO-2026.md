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
| Registros de comissão no banco | 10.197 | **246** |
| Valor total | R$ 19.537,40 | **R$ 60,22** |
| Soma dos saldos das contas | R$ 149,23 | **R$ 60,22** |
| Comissão sobre item não-comissionável | R$ 295,50 | **R$ 0,00** |
| Comissão órfã (sem venda de origem) | R$ 2.116,71 | **R$ 0,00** |
| `total_commissions_generated` | nulo/zero em 100% | **alimentado (17 contas)** |

**Os 246 registros restantes são 100% venda de produto, todos com venda-mãe
rastreável.** Saldo e extrato batem exatamente: R$ 60,22 = R$ 60,22.

### 🔧 CORREÇÃO DE REDAÇÃO (05/08/2026)
A frase original dizia "venda de produto **de agosto/2026**". **Estava errada.**
As vendas-mãe são de **abril e maio/2026**; o que é de agosto é a **data do
recálculo** — o motor grava `created_date` no momento em que roda. O Marco Zero
corta pela data do **registro de comissão**, não pela data da venda. Nenhum
número muda; só a descrição estava imprecisa.

### 💠 DECISÃO SOBRE OS R$ 26,34 (05/08/2026) — NÃO PAGAR
O `acertarComissaoVenda` em `dry_run` sobre 2026 aponta **R$ 26,34** faltando em
6 vendas (todo destinado ao topo). **Decisão: não pagar.** Motivo: as vendas-mãe
são de abril/maio — período declarado como teste. Pagar exigiria **recriar
comissão pré-agosto**, violando o Marco Zero. Fica registrado como
**diferença conhecida e intencional**, não como erro pendente.

### 7.2.1 ⚠️ Correção da 1ª passada (05/08/2026)

A primeira execução parou em 307 registros / R$ 101,70 — mas **61 deles
(R$ 41,48) eram órfãos**, em dois `sale_id` que não existem nem em
`catalog_sales` nem em `auctions`.

**Causa-raiz:** `deveApagar` peneirava por **data** e por **kind**. Uma órfã de
agosto não tem `kind` (a venda-mãe não existe → `kindPorVenda` devolve
`undefined`), então escapava das duas peneiras. O relatório *reportava* o motivo
"órfã", o que mascarou o furo: as 214 que apareceram eram órfãs pré-agosto,
pegas pela **data**, não pelo critério de órfã.

**Correção:** órfã virou critério próprio (`expurgar_orfas`, ligado por padrão),
e a função passou a carregar `auctions` — sem isso, **toda comissão de leilão
pareceria órfã e seria apagada indevidamente**, porque o `sale_id` de leilão vive
em `auctions`. Na execução, 149 leilões foram carregados e protegidos; nenhum
registro de leilão foi tocado.

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

---

## 8. ✅ ALINHAR-HISTORICO-CATALOGO — EXECUTADO EM 07/08/2026

**Autorizado explicitamente pelo dono.** Fecha uma ponta que a ZERAGEM de 04/08
deixou aberta.

### 8.1 O que ficou faltando em 04/08

A ZERAGEM recalculou `total_commissions_generated`, mas **não** recalculou o campo
irmão **`catalog_total_commissions_generated`**. Ele continuou com o valor da era
do motor legado de 26% — valor pré-agosto, portanto teste, sobrevivendo dentro de
contas reais e contrariando a seção 7 item 4 do `VERDADE.md`
("registro pré-agosto que apareça é defeito, não histórico").

### 8.2 O que foi feito

Campo recalculado a partir da **única fonte válida**: soma de `commission_records`
com `sale_type = 'catalog'`, `status` em (`confirmed`, `paid`) e
`created_date >= 2026-08-01`.

| Medida | Antes | Depois |
|---|---|---|
| Contas com o campo divergente | **19** | **0** |
| Soma dos campos históricos de catálogo | R$ 539,36 | **R$ 60,22** |
| Resíduo pré-agosto eliminado | — | **R$ 479,14** |
| Contas gravadas / falhas | — | **19 / 0** |

**Validação cruzada:** a função apurou **246 registros = R$ 60,22** lendo o banco
de forma independente — número idêntico ao cravado na seção 7.2. Confirma que a
base limpa de 04/08 permanece intacta.

### 8.3 Dois achados registrados

1. **A maior distorção não era a maior conta.** `creiciane.silva65` (Elyon) tinha
   **R$ 177,82** no campo com **zero** comissão válida — 100% resíduo do motor
   legado.
2. **Cinco contas estavam para BAIXO, não para cima** (Beatriz 0,38 · Diana 0,06 ·
   Iara 0,12 e outras): tinham comissão válida de agosto e o campo em **zero**.
   Nessas o alinhamento **subiu** o valor — para o valor real, apurado.
   👉 Lição: um campo de histórico não alimentado engana tanto quanto um inflado.

### 8.4 O que NÃO foi tocado

`commission_balance` · `catalog_commission_balance` ·
`total_commissions_generated` · `digital_wallets` / `held_balance` ·
`commission_records` (zero INSERT/UPDATE/DELETE) · `catalog_sales` · `auctions` ·
percentuais oficiais · motores em quarentena.

**Nenhum saldo mudou. Nenhum saque foi afetado.** A alteração foi em **um único
campo de leitura histórica**.

### 8.5 Rastro

- **Função:** `alinharHistoricoCatalogo` — `dry_run: true` por padrão.
- **Escrita por ID, uma a uma** — nunca UPDATE em massa por data
  (trava técnica da seção 4 do `RETRATO-BANCO-ANTIGO-ANTES-EXPURGO-05AGO2026.md`).
- **Conferência por releitura independente** após gravar: 19/19 conferem.
- **Prova final:** nova simulação pós-execução retornou
  **`contas_divergentes: 0`** e **`residuo_a_eliminar: 0`**.
- Banco: Supabase REST + `service_role` (`VERDADE.md` §2).