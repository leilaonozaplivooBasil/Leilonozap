# 🎟️ DOCUMENTO OFICIAL — PASSAPORTE DE LANCES E CARTEIRA DIGITAL

> **Regra ditada por:** Luiz Sant'anna (dono), em 27/08/2026, por escrito e em três
> áudios no grupo interno. As citações deste documento são literais.
> **Documento escrito em:** 27/08/2026, a partir dessas falas.
> **Natureza:** REGRA. Define para que serve o dinheiro do cliente.
> **Hierarquia:** subordinado a `docs/VERDADE.md`. Autoridade **exclusiva** sobre
> carteira digital, Passaporte de Lances e o que a Loja Virtual aceita.
>
> **Por que este documento existe:** até 27/08/2026 esta regra — a mais importante do
> negócio — não estava escrita em documento nenhum. Vivia só em comentário de código e
> em migração de banco. O próprio `VERDADE.md` diz, na seção 1, que **comentário de
> código não é fonte de verdade**. Resultado prático: telas prometendo o contrário da
> regra por oito dias, R$ 76,09 de bônus pagos em dobro, e uma proposta de mudar a regra
> circulando internamente como se estivesse autorizada.
>
> ⚠️ **O sistema NÃO cumpre esta regra por inteiro hoje.** A seção 7 diz exatamente
> onde ele diverge, e quanto isso vale. Este documento descreve **a regra**, não o
> comportamento atual.

---

## 1. A REGRA, NAS PALAVRAS DO DONO

> *"O depósito da carteira é somente pro leilão."*
>
> *"Esses cem reais, ele é usado exclusivamente para lance. E ele só é potencializado
> pra loja virtual **após acabar** um determinado leilão que ele deu lance."*
>
> *"Após o leilão acabar, caso você não ganhe... **seu dinheiro volta com mais 10%**.
> Seu dinheiro voltou potencializado de 10%... **liberado para você usar na loja
> virtual**. É isso, a regra é essa."*

E, sobre liberar antes disso:

> *"Jamais o cliente pode usar."*
> *"O dinheiro fica travado até o final do leilão. O dinheiro **não** volta
> automaticamente só porque ele deu lance e ele foi superado."*

---

## 2. POR QUE O DEPÓSITO EXISTE

Palavra do dono, literal:

> *"O leilão, ele tem datas, tem prazos. Então, se eu não debitasse esse valor
> automaticamente da carteira do cliente, ele ia **inflar o preço**. E poderia ocorrer
> que no final do leilão, ele **não pagasse** isso. Então a cobrança precisa ser
> antecipada."*

O depósito não é conveniência de pagamento. É a **garantia de que o lance é real** —
sem ele, qualquer pessoa infla o preço de um leilão de uma semana e some no dia do
martelo.

### O valor mínimo do depósito

> *"Então qual foi o depósito estipulado? **Cem reais**."*

Depósito mínimo: **R$ 100,00 ou mais**. É também o piso a partir do qual o crédito de
10% existe (`DEPOSITO_MINIMO` em `api/_lib/passaporteCoupon.js`).

### As duas formas de comprar — não se misturam

> *"O cara tem duas formas de comprar. Se ele quer comprar com desconto, ele vai direto
> na loja virtual. E ele **já não precisa depositar dinheiro na carteira pra isso**.
> Ninguém faz isso. A gente tem uma loja virtual, um e-commerce, que ele pode comprar
> direto."*

| Quer comprar direto, com desconto | Quer disputar no leilão |
|---|---|
| Vai na Loja Virtual e paga com **PIX ou cartão** | Deposita na carteira |
| **Não precisa depositar nada** | O depósito serve só para lance |

O dinheiro da carteira só chega na Loja Virtual por **um caminho**: tendo disputado um
leilão, e tendo perdido.

---

## 3. OS TRÊS ESTADOS DO DINHEIRO

| # | Estado | Pode dar lance? | Pode comprar na loja? | Quando |
|---|---|:---:|:---:|---|
| 1 | **LIVRE** | ✅ | ❌ | Depositado, ainda não usado em lance nenhum |
| 2 | **COMPROMETIDO** | ✅ | ❌ | Foi coberto, mas **aquele leilão ainda está rolando** |
| 3 | **RESERVADO** | ❌ | ❌ | Está no lance em que o cliente lidera agora |

O estado 2 é o que o dono descreve nos dois áudios: ser coberto **devolve o dinheiro
para relançar**, mas não libera nada para a loja.

> *"Volta o dinheiro para a carteira, mensagem 'você foi superado'. Mas o leilão ainda
> está ativo, você pode dar outro lance."*
>
> *"O dinheiro fica travado até o final do leilão."*

Implementação: `api/_lib/compromissoLeilao.js`

---

## 4. O QUE ACONTECE QUANDO O LEILÃO ACABA

É aqui que o dinheiro muda de natureza. Cada leilão resolve **só a fatia dele** — o
valor que foi apostado naquele leilão, não o depósito inteiro.

| Desfecho | O que acontece com o valor do lance |
|---|---|
| **Perdeu** | Volta **acrescido de 10%**, e esse total fica **liberado para a Loja Virtual** |
| **Ganhou** | Virou a compra. *"Se ele ganhar, ele comprou com 20 reais."* |

### O exemplo oficial, do próprio dono

> *"Botei 100 reais na carteira, dei 20 reais de lance em cinco leilões de um mês."*
>
> *"O primeiro leilão que acabou, que ele deu os 20 reais de lance... se ele não ganhar,
> automaticamente esses 20 volta pra carteira **potencializado de dois**."*

R$ 20 de lance perdido → **R$ 22 liberados para a Loja Virtual.**
Os cinco leilões perdidos → **R$ 110 na Loja Virtual**, sobre um depósito de R$ 100.

Os 10% incidem sobre **o lance daquele leilão**, não sobre o depósito inteiro. Foi assim
que a regra ficou desde 19/08/2026, e é o que o áudio confirma ("20 → potencializado de
dois").

### Por que fatiado, e não tudo de uma vez

Até 19/08/2026 o crédito liberava **inteiro** na primeira derrota, qualquer que fosse o
tamanho do lance. Dava para depositar R$ 100, dar um lance de R$ 1 num leilão perdido de
propósito e destravar os R$ 10 completos sem nunca ter arriscado o depósito.

### Por que não libera antes

> *"E se eu liberar o valor potencializado de 10% automaticamente, os clientes vão se
> aproveitar disso para comprar com mais descontos."*

---

## 5. O QUE O CLIENTE ASSINA, E O QUE A TELA DEVE DIZER

> *"No ato do depósito, eu já tenho um documento que me explica toda essa operação."*
>
> *"Abre uma caixa para ele assinar digitalmente a regra que explica isso tudo."*
>
> *"Isso precisa focar explícito na carteira."*

O aceite é gravado com data e versão em `app_users.passaporte_terms_accepted_at` e
`passaporte_terms_version`. Versão vigente: **`2026-08-01`**.

O cliente declara que o valor é **crédito de consumo**, de uso exclusivo dentro do
ecossistema, e **irrestornável** após a confirmação do pagamento (salvo falha técnica
comprovada da plataforma, art. 18 do CDC). As disputas são **competição de preços de
caráter promocional** — não leilão oficial nos termos do Decreto nº 21.981/32.

### As duas mensagens de "você foi superado"

Pedido explícito do dono, nos áudios — a mensagem atual está certa, mas incompleta:

| Momento | O que a mensagem deve dizer |
|---|---|
| Coberto, **leilão ainda ativo** | *"Você foi superado. Leilão ainda ativo — você pode dar outro lance."* |
| Coberto, **leilão terminado** | *"Você foi superado, leilão terminado. Seu dinheiro voltou potencializado de 10%, liberado para você usar na Loja Virtual."* |

---

## 6. COMO JULGAR UMA RECLAMAÇÃO

> *"Precisa consultar e ver como está a regra. Pegar o documento oficial, confrontar
> para ver se não é erro do usuário ou erro do sistema."*

| Situação do leilão | Ganhou? | O que deve ter acontecido |
|---|:---:|---|
| **Ainda ativo** | — | O dinheiro voltou para a carteira **para relançar**, e nada foi liberado para a loja. Está correto |
| **Terminou** | Não | O valor do lance voltou **+10%**, liberado para a loja. Se não voltou, **é dívida da plataforma** |
| **Terminou** | Sim | Virou o produto que ele levou |

**A pergunta que resolve qualquer caso, antes de mover um centavo:** *o leilão em que ele
deu esse lance já terminou?*

### ⚠️ Armadilha conhecida na conferência

Se o leilão foi **apagado**, o lance continua registrado mas some de qualquer consulta
que cruze lance com leilão — e o cliente aparece, falsamente, como quem nunca deu lance.
Sempre contar os lances **sem esse cruzamento** antes de concluir.

Medido em 27/08/2026: **560 lances órfãos**, 29 clientes, 132 leilões apagados.

---

## 7. ⚠️ ONDE O SISTEMA NÃO CUMPRE ESTA REGRA HOJE

**Levantado em 27/08/2026. Nada aqui foi alterado — está registrado para decisão.**

### 7.1 O principal do lance não chega na Loja Virtual

| Por lance de R$ 20 perdido em leilão encerrado | A regra | O sistema hoje |
|---|---:|---:|
| Liberado para a Loja Virtual | **R$ 22,00** | R$ 2,00 |
| Volta como saldo de lance | R$ 0,00 | R$ 20,00 |

O sistema libera **só os 10%** como crédito de loja. O valor do lance volta para a
carteira e continua servindo apenas para lance — nunca vira crédito de loja, mesmo
depois de o leilão acabar.

No exemplo do dono (R$ 100 em cinco lances de R$ 20, todos perdidos): a regra entrega
**R$ 110 na loja**; o sistema entrega **R$ 10 na loja** e deixa R$ 100 presos como saldo
de lance.

### 7.2 A Loja Virtual não aceita saldo de carteira de forma nenhuma

Existe a rotina que aplicaria a regra dos três estados (`debitWalletBalance.js`, escopo
`loja`), mas **nenhuma tela e nenhuma outra rotina a chama**. Hoje a loja aceita PIX,
cartão, saldo de comissão e crédito Passaporte já liberado — e nada da carteira.

### 7.3 A mensagem de "superado" não distingue leilão ativo de leilão terminado

Existe uma mensagem só. O dono pediu duas (seção 5).

---

## 8. TRAVAS QUE NÃO PODEM CAIR

Cada uma protegida por teste automático.

1. A liberação acontece **exclusivamente** no encerramento do leilão
   (`finalizeAuctionCore.js`). Nenhum outro ponto libera crédito Passaporte.
2. Libera **só a fatia daquele leilão** — nunca o depósito inteiro.
3. Ser coberto **não** libera nada para a loja.
4. Cupom do modelo antigo (`bonus_creditado_em` preenchido) **nunca** é liberado nem
   recolhido pelo motor do modelo atual.
5. O recolhimento por arremate **nunca** deixa saldo negativo.
6. As telas **não podem** prometer crédito "na hora".

Testes: `tests/passaporteBonusDobrado.test.mjs` · `tests/passaporteNaoLiberava.test.mjs`

---

## 9. HISTÓRICO DA REGRA

| Data | O que mudou |
|---|---|
| **31/07/2026** | Cupom Passaporte criado: 10% do aporte, liberado só para quem disputou e perdeu. Nasce bloqueado |
| **01/08/2026** | Modelo do bônus imediato: passa a creditar +10% na hora, no saldo de lance. Recolhe se arrematar |
| **04–05/08/2026** | `VERDADE.md` e `MARCO-OFICIAL-AGOSTO-2026.md` criados. Antes de 01/08 é teste, depois é dinheiro real |
| **08/08/2026** | Regra dos três estados do dinheiro oficializada |
| **18/08/2026** | `reserva_ledger` criada — extrato do saldo reservado |
| **19/08/2026** | Volta o modelo bloqueado, agora **fatiado** por leilão |
| **26/08/2026** | Removida a liberação que acontecia ao ser coberto — contrariava a regra |
| **27/08/2026** | Corrigido o bônus pago em dobro (R$ 76,09). Telas reescritas. Unificação irrestrita da carteira **recusada**. Regra ditada pelo dono por escrito e em áudio. Este documento criado |

---

## 10. O QUE ESTE DOCUMENTO NÃO COBRE

- **Comissão e plano de carreira** → `docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md`
- **Qual é o banco de produção e o que não acreditar** → `docs/VERDADE.md`
- **Onde ficam os dados e como o front chama o backend** → `CONTRATO.md`
- **O que foi feito em cada data** → `MUDANCAS.md` (histórico, **não é regra**)

---

## 11. PENDÊNCIAS ABERTAS NESTA ÁREA

**Status em 27/08/2026. Nenhuma resolvida.**

1. **As três divergências da seção 7** — o principal não chega na loja, a loja não
   aceita saldo de carteira, e a mensagem de superado é uma só.
2. **Apagar um leilão não limpa nada do que ele deixou.** Os lances continuam gravados
   apontando para o vazio e o dinheiro reservado fica preso, sem rotina que devolva.
   560 lances órfãos, o mais antigo de 25/09/2025, o mais recente de 11/08/2026.
3. **Não existe registro de quem apagou um leilão, nem quando.** As três telas que
   apagam não gravam log, e a exclusão vai direto ao banco.
4. **Reserva feita sem lance gravado.** Um caso confirmado em 19/08/2026: R$ 17,20
   reservados duas vezes, sem nenhum lance correspondente registrado.
