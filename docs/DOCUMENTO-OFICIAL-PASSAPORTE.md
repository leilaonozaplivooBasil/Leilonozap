# 🎟️ DOCUMENTO OFICIAL — PASSAPORTE DE LANCES E CARTEIRA DIGITAL

> **Criado em:** 27/08/2026 · **Autorizado por:** Luiz Sant'anna (dono)
> **Natureza:** REGRA. Define para que serve o dinheiro do cliente.
> **Hierarquia:** subordinado a `docs/VERDADE.md`. Autoridade **exclusiva** sobre
> carteira digital, Passaporte de Lances e o que a Loja Virtual aceita como pagamento.
>
> **Por que este documento existe:** até hoje esta regra — a mais importante do
> negócio — não estava escrita em documento nenhum. Vivia só em comentário de código
> e em migração de banco. O próprio `VERDADE.md` diz, na seção 1, que **comentário de
> código não é fonte de verdade**. Resultado prático, medido em 27/08/2026: telas
> prometendo o contrário da regra, R$ 76,09 de bônus pagos em dobro, e uma proposta
> de mudar a regra circulando internamente como se estivesse autorizada.

---

## 1. A REGRA, EM UMA FRASE

**O dinheiro depositado na carteira digital é compra de Passaporte de Lance.
Serve para dar lance. Só vira crédito de Loja Virtual pela regra do bônus,
depois que o leilão disputado termina.**

Palavra do dono, 27/08/2026:

> "Dinheiro depositado na carteira digital para comprar na loja virtual somente
> após o leilão que ele deu lance acabar. **Jamais o cliente pode usar** [antes]."

---

## 2. OS TRÊS ESTADOS DO DINHEIRO

A carteira não tem duas situações. Tem três, e cada uma permite coisas diferentes.

| # | Estado | Pode dar lance? | Pode comprar na loja? | O que é |
|---|---|:---:|:---:|---|
| 1 | **LIVRE** | ✅ | ✅ | Não está preso em nenhum leilão em andamento |
| 2 | **COMPROMETIDO** | ✅ | ❌ | Foi coberto num leilão que **ainda está rolando** |
| 3 | **RESERVADO** | ❌ | ❌ | Está no lance em que o cliente lidera agora |

**Por que o estado 2 não é uma coluna no banco:** ele é derivado dos próprios lances.
Guardar em coluna criaria uma segunda verdade que pode dessincronizar do leilão real —
foi assim que nasceram as reservas órfãs de 08/08/2026. O número é sempre recalculado a
partir dos lances vivos: se o leilão fecha, o compromisso some sozinho.

Implementação: `api/_lib/compromissoLeilao.js`

---

## 3. O BÔNUS DE 10% — COMO FUNCIONA HOJE

Depósito de **R$ 100,00 ou mais** gera um crédito de **10% do valor aportado**.

| Momento | O que acontece com o bônus |
|---|---|
| No depósito | Nasce **BLOQUEADO**. Não cai na carteira. Não soma no saldo de lance. Não é gastável em lugar nenhum |
| Leilão disputado termina e o cliente **NÃO ganhou** | Libera **10% do lance daquele leilão** (não do depósito inteiro) como crédito de Loja Virtual |
| Leilão disputado termina e o cliente **GANHOU** | Aquela fatia é **cancelada**. O valor pago virou a compra |
| Cliente é apenas **coberto**, leilão continua | **Nada acontece.** Ele ainda pode relançar e vencer |

**Exemplo oficial do dono:** depositou R$ 100 e espalhou em 10 lances de R$ 10, em
leilões de datas diferentes. O crédito volta em **10 pedaços de R$ 1,00**, conforme
cada leilão fecha.

### Por que fatiado, e não tudo de uma vez

Até 19/08/2026 o cupom liberava **inteiro** na primeira derrota, qualquer que fosse o
tamanho do lance. Dava para depositar R$ 100, dar um lance de R$ 1 num leilão perdido
de propósito e destravar os R$ 10 completos sem nunca ter arriscado o depósito. A regra
fatiada fechou essa porta.

Implementação: `api/_lib/passaporteCoupon.js` · liberação em `api/_lib/finalizeAuctionCore.js`

### ⚠️ O modelo antigo (01/08 → 19/08/2026)

Depósitos feitos **entre 01/08 e 19/08/2026** seguiram outra regra: o bônus era somado
**direto no saldo de lance** no ato do depósito, e recolhido de volta se o cliente
arrematasse.

Esses registros continuam válidos e **não devem ser reprocessados pela regra atual**.
A marca que os distingue é a coluna `bonus_creditado_em`, preenchida **só** pelo modelo
antigo. Confundir os dois foi o que produziu os R$ 76,09 pagos em dobro.

---

## 4. O QUE A LOJA VIRTUAL ACEITA

| Forma de pagamento | Aceita? |
|---|:---:|
| PIX | ✅ |
| Cartão de crédito | ✅ |
| Crédito Passaporte **já liberado** | ✅ |
| Saldo de comissão | ✅ |
| **Saldo de depósito da carteira** | ❌ |

### Decisão registrada — 27/08/2026

**Não haverá unificação das carteiras.** Uma proposta de fazer o saldo de leilão valer
também na Loja Virtual circulou internamente como se estivesse autorizada. **Não estava,
e não está.** O dono recusou expressamente.

Motivo do negócio: liberar o valor potencializado de 10% para compra imediata faria o
desconto virar a finalidade e a disputa virar enfeite.

---

## 5. O QUE O CLIENTE ASSINA

Antes do **primeiro depósito**, o cliente marca um aceite obrigatório declarando que o
valor é **crédito de consumo**, de uso exclusivo dentro do ecossistema Leilão NoZap, e
**irrestornável** após a confirmação do pagamento (salvo falha técnica comprovada da
plataforma, art. 18 do CDC).

O aceite é gravado com **data e versão** em `app_users.passaporte_terms_accepted_at` e
`passaporte_terms_version`. Versão vigente: **`2026-08-01`**.

As disputas do Leilão NoZap são **competição de preços de caráter promocional** — não
leilão oficial nos termos do Decreto nº 21.981/32. Não há leiloeiro público envolvido.

Implementação: `src/lib/passaporteTermo.js` · `src/components/passaporte/AvisoLegalPassaporte.jsx`

---

## 6. COMO JULGAR UMA RECLAMAÇÃO

Quando um cliente disser que deu lance e o valor não voltou, existem exatamente três
situações. Elas se distinguem pela **situação do leilão**, nunca pelo que o cliente
lembra.

| Situação do leilão | Ganhou? | O que o sistema deve ter feito |
|---|:---:|---|
| **Ainda ativo** | — | **Nada.** O dinheiro está preso e é para estar. Liberar seria quebrar a regra |
| **Terminou** | Não | Liberou 10% do maior lance dele naquele leilão. Se não liberou, **é dívida da plataforma** |
| **Terminou** | Sim | Cancelou a fatia. O valor virou o produto que ele levou |

**A pergunta que resolve qualquer caso, antes de mover um centavo:**
*o leilão em que ele deu esse lance já terminou?*

### ⚠️ Armadilha conhecida na conferência

Se o leilão foi **apagado**, o lance continua registrado mas some de qualquer consulta
que cruze lance com leilão — e o cliente aparece, falsamente, como quem nunca deu lance.
Sempre contar os lances **sem esse cruzamento** antes de concluir.

Medido em 27/08/2026: **560 lances órfãos**, 29 clientes, 132 leilões apagados.

---

## 7. TRAVAS QUE NÃO PODEM CAIR

Cada uma destas está protegida por teste automático. Se alguém as remover, a alteração
não sobe.

1. A liberação do bônus acontece **exclusivamente** no encerramento do leilão
   (`finalizeAuctionCore.js`). Nenhum outro ponto do sistema libera crédito Passaporte.
2. Libera **só 10% do lance daquele leilão** — nunca 10% do depósito.
3. Ser coberto **não** libera nada.
4. Cupom do modelo antigo (`bonus_creditado_em` preenchido) **nunca** é liberado nem
   recolhido pelo motor do modelo atual.
5. O recolhimento por arremate **nunca** deixa saldo negativo.
6. As telas **não podem** prometer crédito "na hora".

Testes: `tests/passaporteBonusDobrado.test.mjs` · `tests/passaporteNaoLiberava.test.mjs`

---

## 8. HISTÓRICO DA REGRA

| Data | O que mudou |
|---|---|
| **31/07/2026** | Cupom Passaporte criado: 10% do aporte, liberado só para quem disputou e perdeu. Nasce bloqueado |
| **01/08/2026** | Modelo do bônus imediato: passa a creditar +10% na hora, no saldo de lance. Recolhe se arrematar |
| **04–05/08/2026** | `VERDADE.md` e `MARCO-OFICIAL-AGOSTO-2026.md` criados. Marco: antes de 01/08 é teste, depois é dinheiro real |
| **08/08/2026** | Regra dos três estados do dinheiro oficializada. Ser coberto devolve na hora para relançar, mas o valor segue preso para a loja |
| **18/08/2026** | `reserva_ledger` criada — extrato do saldo reservado |
| **19/08/2026** | Volta o modelo bloqueado, agora **fatiado** por leilão. Fecha a fraude do lance de R$ 1 |
| **26/08/2026** | Removida a liberação que acontecia ao ser coberto — contrariava a regra |
| **27/08/2026** | Corrigido o bônus pago em dobro (R$ 76,09). Telas reescritas. Unificação de carteiras **recusada** pelo dono. Este documento criado |

---

## 9. O QUE ESTE DOCUMENTO NÃO COBRE

- **Comissão e plano de carreira** → `docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md`
- **Qual é o banco de produção e o que não acreditar** → `docs/VERDADE.md`
- **Onde ficam os dados e como o front chama o backend** → `CONTRATO.md`
- **O que foi feito em cada data** → `MUDANCAS.md` (histórico, **não é regra**)

---

## 10. PENDÊNCIAS ABERTAS NESTA ÁREA

**Status em 27/08/2026. Nenhuma resolvida.**

1. **Apagar um leilão não limpa nada do que ele deixou.** Os lances continuam gravados
   apontando para o vazio e o dinheiro reservado fica preso, sem rotina que devolva.
   560 lances órfãos, o mais antigo de 25/09/2025, o mais recente de 11/08/2026.
2. **Não existe registro de quem apagou um leilão, nem quando.** As três telas que
   apagam (`AuctionControl`, `EditAuction`, `GestaoLotes`) não gravam log, e a exclusão
   vai direto ao banco.
3. **Reserva feita sem lance gravado.** Um caso confirmado em 19/08/2026: R$ 17,20
   reservados duas vezes, sem nenhum lance correspondente registrado.
