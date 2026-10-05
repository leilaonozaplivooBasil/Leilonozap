# 🧾 Auditoria financeira das comissões — 05/10/2026 (DIR-200)

**Pedido do dono:** "auditoria financeira extremamente diligente; atualize os pagamentos após os 7 dias; relatório destrinchando os 10% dos depósitos, os 5% do leilão e a venda da loja virtual por licença (Influenciador, Vendedor, Parceiro etc.); analise todo o sistema financeiro, traga erros e bugs e como funcionam os pagamentos hoje."

Tudo abaixo foi conferido no banco de produção e no código, em 05/10/2026 (até 18h30 de Brasília). **Nenhum saldo foi alterado** nesta auditoria. O que é correção de regra (futuro) está marcado como *feito*; o que mexe em dinheiro de alguém está marcado como *decisão do dono*.

---

## 1. Como o pagamento de comissão funciona hoje (a régua inteira)

Existem **três origens** de comissão, cada uma com a sua régua, e **um só saldo** por pessoa (`commission_balance`), que é o que a tela de Pagamentos de Comissões chama de "A receber (no saldo)".

### 1.1 Indicação de depósito — 10%
- Vale para depósito na carteira **pago a partir de 23/09/2026 03h00 (UTC)**. Depósito anterior não gera nada (84 depósitos, R$ 22.431, ficaram de fora pela regra).
- Quem ganha: quem indicou o depositante (`referred_by_id`). Auto-indicação e indicador desativado não ganham.
- O valor nasce **em espera** (`commission_ledger`, `a_liberar`) e **libera sozinho 7 dias depois**, na hora exata do depósito, pelo robô `liberar-comissao-indicacao` (todo minuto 7 de cada hora). Ao liberar, soma no saldo da pessoa e cria a linha "Gerada" na tela (`commission_records`, papel `indicacao_deposito`).
- Se o depósito for devolvido/contestado no gateway, a comissão em espera é cancelada e a já liberada é estornada do saldo (regra DIR-198).

### 1.2 Leilão — 5% + 10% + retido
- No **martelo** (fim do leilão), sobre o valor do arremate **sem frete**: 5% para quem indicou o arrematante (`leilao_indicador`); desde 28/09 14h, 10% para o executivo da estrutura do arrematante (`leilao_executivo`; a conta do dono está fora da regra); o resto dos 30% fica retido na conta oficial (`leilao_retido`).
- Leilão de teste e Plano de Investimento não comissionam (36 planos de R$ 5.000 conferidos: zero comissão, correto).
- A comissão é paga **no martelo, antes do pagamento do arrematante**. Hoje só há 1 leilão não pago com comissão gerada (cadeira R$ 246, indicador = conta oficial), então não houve prejuízo a terceiros; mas a regra em si é um risco (item 4.4).

### 1.3 Loja virtual (e balcão) — 30% da venda
- Motor único em `api/_lib/arvoreOficial.js`, aplicado quando a venda vira paga:
  - **Governança (9%)**, por cargo, dividido entre quem tem o cargo: CEO 3 · Livoo Live 2 · Embaixador 1 · Conselheiros 1 · Fundadores 1 · Diretoria Executiva 0,5 · Diretoria de Operação 0,5.
  - **Executivo (1%)**: só da própria estrutura; sem executivo, fica com a empresa.
  - **Cadeia (20%)**, telescópica: quem vendeu leva o % cheio do cargo (Influenciador 5 · Vendedor 10 · Licenciado 13 · Parceiro 15 · Ponto de Retirada 16 · Loja Física 19 · Distribuidor 20) e cada upline leva só a diferença até o nível de baixo (rebate); teto 20%; o que sobrar sem dono vai para a empresa como `distribuidor`/`empresa_rollup`.
- Crédito atômico no saldo (`rpc/credit_commission`) no mesmo ato da linha. Frete nunca comissiona. Arremate pago pela loja não passa por esta régua.

### 1.4 Como o dinheiro sai
- **Pagamento manual (tela de Pagamentos)**: a Beatriz marca as linhas "Gerada", informa a chave PIX usada, e o servidor desconta o saldo **no mesmo ato** (trava atômica; recusa se o saldo não cobre) e grava em `comissao_pagamentos_manuais`. Conferido: **14 pagamentos, R$ 2.583,56, todos batem** (valor = soma das linhas; saldo antes − valor = saldo depois).
- **Saque pela plataforma**: exige KYC aprovado e chave PIX = CPF do titular; reserva o saldo ao pedir. Só 3 saques existem (Elenice, 3× R$ 80, pagos em 26/09).
- **Compra com saldo**: a pessoa pode pagar uma compra na loja com o saldo de comissão (depósito primeiro, comissão no que faltar). Isso **debita o saldo sem marcar a linha como paga** (item 4.2).

---

## 2. Os números hoje (05/10/2026)

| Origem | Em espera (7 dias) | A receber (geradas) | Já pago | Estornado |
|---|---|---|---|---|
| Indicação de depósito 10% | R$ 1.636,00 (16 linhas; R$ 505 são da conta oficial) | R$ 82,70 (3) | R$ 1.100,00 (14) | R$ 330,00 cancelado antes de liberar (Diogo/João) |
| Leilão 5% indicador | — | R$ 534,02 (27) | R$ 282,08 (25) | 0 |
| Leilão 10% executivo (desde 28/09) | — | R$ 2,40 (1, Ribeiro) | 0 | 0 |
| Leilão retido (empresa) | — | R$ 4.078,11 (52) | — | — |
| Loja virtual (todos os cargos) | — | R$ 2.219,65 | R$ 1.201,48 | R$ 39,68 |

- `commission_records`: 1.297 geradas (R$ 6.916,88), 250 pagas (R$ 2.583,56), 106 estornadas (R$ 39,68). Nenhuma "pending" (crédito que falhou).
- **Saldos**: 23 contas com saldo > 0, somando R$ 6.797,06; **R$ 4.939,77 são da conta oficial da empresa** (retido do leilão + fatia sem dono da loja + indicações de depósito de clientes indicados pela própria empresa). Rede de verdade: R$ 1.857,29.
- Maiores a receber: Verônica R$ 435,10 (+ R$ 751 em espera), Luiz R$ 391,18, Livoo Live R$ 270,62, Distribuidor Bangu R$ 137,05, Top Tech R$ 117,53, Luis Francisco R$ 107,54 (+ R$ 380 em espera).

---

## 3. O que foi verificado e **bate**

1. **Liberação dos 7 dias**: 17 linhas liberadas, todas entre 5 e 58 minutos depois do vencimento; nenhuma vencida sem liberar; as 16 em espera vencem entre 06/10 e 11/10. O robô rodou pela última vez em 05/10 15h07 UTC com sucesso.
2. **10% certinho**: as 37 comissões de depósito são exatamente 10% do depósito e `release_at` = depósito + 7 dias (todas).
3. **Nenhum depósito na regra ficou sem comissão**: 37 depósitos pagos desde 23/09 com indicador → 37 linhas no ledger.
4. **Loja: 47 vendas pagas desde 01/08 com comissão, todas somam 30% da venda** (R$ 3.407,83 sobre R$ 11.358,79; diferença de centavos só por arredondamento). Percentuais por cargo conferidos venda a venda (ex.: Vendedor 10% direto + Licenciado 3% + Parceiro 2% + Distribuidor 5% = 20%; Parceiro 15% direto + Distribuidor 5%).
5. **Leilão**: todos os 52 leilões com comissão somam 30% (5% + retido, ou 5% + 10% + retido depois de 28/09). Todo leilão real encerrado com vencedor desde 21/08 tem comissão; os sem comissão são só Planos de Investimento (correto).
6. **Pagamentos manuais**: 14 de 14 batem (linhas = valor; saldo antes/depois corretos).
7. **Nenhuma comissão duplicada** (venda + pessoa + papel) e **nenhuma linha gerada em venda cancelada/devolvida** segue "Gerada" (as de vendas canceladas estão estornadas).
8. **Saldo = extrato** para 20 das 23 contas com saldo (Verônica, Livoo, Bangu, Top Tech, Luis Francisco, Emannuel, Eloha, Flavio, Amancio, Ponto Bangu, Luciene, Fabio, Gabrielle, Jean, Karen, Ribeiro, Iara, Aline, Diana e a conta oficial). Nenhum saldo negativo.

---

## 4. Erros, riscos e divergências encontrados

### 4.1 🔴 Saldo menor que o extrato em 3 contas internas (R$ 140,26)
| Conta | Saldo | Linhas "Gerada" | Diferença |
|---|---|---|---|
| Luiz Santanna | 391,18 | 496,27 | −105,09 |
| Beatriz Sant'anna | 51,53 | 72,11 | −20,58 |
| Luciano Pinheiro | 18,73 | 33,32 | −14,59 |

Causa: **compras pagas com saldo** (`comprar_com_saldo` usa depósito primeiro e comissão no que falta) e, no caso do Luciano, a diferença já existia em 28/09 antes do pagamento manual (saldo 209,61 contra 224,18 de linhas). As três contas compraram na loja com saldo (Beatriz 15/09, Luciano 14/09, Luiz várias). Não é dinheiro perdido: foi **gasto em compra**. O erro é de **registro**: a linha continua "Gerada" como se estivesse por pagar. Nenhuma conta da rede externa tem essa diferença. *Decisão do dono*: marcar essas linhas como "usada em compra" (sem mexer em saldo) ou deixar como está. A tela agora mostra essa divergência em "Saldos fora do extrato" para nunca mais passar despercebida.

### 4.2 🟠 Compra com saldo de comissão não deixa rastro na linha
Quando alguém paga uma compra com o saldo de comissão, o saldo cai mas nenhuma linha vira "paga" e não há lançamento em `wallet_ledger`. É a causa do 4.1 e vai se repetir. *Proposta* (próximo passo, sem mexer em saldo): gravar em `wallet_ledger` a parte paga com comissão (`tipo = 'compra_com_comissao'`) e mostrar na tela de Pagamentos como "usado em compra".

### 4.3 🟠 Comissão de depósito liberada sem olhar se o depósito ainda está de pé — **corrigido**
`liberar_saldos_maturados` liberava toda linha vencida sem checar se a venda continuava paga ou se o gateway já tinha devolvido/contestado. A rede de segurança de DIR-198 cobre o caminho do webhook, mas não um depósito devolvido que o webhook não avisou. **Agora** (migração `20261005200000`): depósito não pago, devolvido ou com chargeback → linha vira `cancelado` sem creditar; depósito retido/em disputa/alterado e ainda não tratado na conciliação → fica em espera até ser tratado.

### 4.4 🟠 Estorno do depósito não estornava a linha "Gerada" — **corrigido**
`estornar_comissoes_do_deposito` tirava do saldo mas deixava a linha `indicacao_deposito` como "Gerada" na tela (dava para pagar na mão de novo). **Agora** a linha vira "Estornado" junto; se já tinha sido paga, o retorno avisa (`ja_pagas`) para cobrança manual.

### 4.5 🟠 5% e 10% do leilão são pagos no martelo, antes do arrematante pagar
Se o arrematante não paga, a comissão já saiu. Hoje só 1 caso (R$ 12,30 + R$ 61,50, ambos na conta oficial). *Decisão do dono*: manter (é como está documentado: "o martelo já é o pagamento") ou passar a pagar só quando o arremate for pago. Se mudar, é uma mudança de regra da rede.

### 4.6 🟡 Liberação antecipada de R$ 125 (Luciano) em 28/09
A linha do depósito de 26/09 (vencia 03/10 15h51) foi liberada em **28/09 14h51**, fora do robô, e paga no mesmo dia dentro do pagamento manual de R$ 190,86. Foi no meio da operação de 28/09 (Grupo C / zerar comissões). Está registrado; só fica aqui para o dono saber.

### 4.7 🟡 16 vendas de balcão (planilha Nexus) de 03 a 15/08 sem comissão — R$ 3.381,40 de vendas, R$ 1.014,42 de comissão (30%) nunca gerada
Vendas `kind = produto`, `source = nexus`, de Elenice (10), Beatriz (5) e Iara (1). As vendas Nexus a partir de 15/08 **têm** comissão. *Decisão do dono*: gerar retroativo (a maior parte é da Elenice, cujo saldo o dono mandou zerar em 28/09) ou deixar.

### 4.8 🟡 A conta oficial da empresa aparece como "pessoa a receber"
O "Total no saldo das pessoas" da tela somava os R$ 4.939,77 da conta oficial. **Corrigido na tela**: a empresa sai do total e ganha o próprio bloco "Retido pela empresa".

### 4.9 🟡 A empresa recebe 10% de indicação de depósito dos clientes que ela mesma indicou
Clientes sem indicador real (cadastro direto) têm `referred_by_id` = conta oficial, então 10% do depósito deles vira comissão **para a própria empresa** (R$ 505 em espera + R$ 2,70 liberado). É dinheiro da empresa para a empresa; não erra o caixa, mas infla "comissão" nos relatórios. *Decisão do dono*: excluir a conta oficial da regra dos 10%.

### 4.10 🟡 Pools de governança: quem foi "zerado" em 28/09 continua acumulando
Ribeiro, Iara e Elenice tiveram o saldo zerado por ordem do dono em 28/09, mas continuam com cargos nos pools e voltaram a acumular (Ribeiro R$ 3,48, Iara R$ 1,20 + R$ 2,40 de leilão). Se a intenção era cortar a comissão deles, falta tirar o cargo. *Decisão do dono*.

### 4.11 🟢 Ferramenta perigosa: `recalculateCommissionBalances`
Ela reescreve o saldo como "soma das linhas Geradas". Rodar hoje **criaria R$ 140,26** nas 3 contas do item 4.1 (dinheiro já gasto). Não rodar sem antes resolver 4.1.

---

## 5. O que foi feito nesta diretiva (DIR-200)
- Migração `20261005200000_auditoria_comissoes_relatorio.sql` (aplicada em produção): `liberar_saldos_maturados` com segurança (4.3), `estornar_comissoes_do_deposito` estorna a linha (4.4), nova função `relatorio_comissoes()` (só servidor).
- Rota `api/functions/relatorioComissoes.js` (admin, com crachá).
- Tela `/PagamentosComissoes`: bloco **"Relatório por origem e licença"** (depósito 10% · leilão 5%/10% · loja por cargo, com em espera / a receber / pago / estornado e próximas liberações), **"Saldos fora do extrato"** (auditoria viva do item 4.1), empresa separada das pessoas (4.8), e no cartão de cada pessoa o resumo por origem e o nome do cargo em português.
- Testes `tests/auditoriaComissoes.test.mjs`.

## 6. Decisões — tomadas em 05/10/2026 (DIR-201), por delegação do dono ("quero que você decida isso")
1. **4.1 / 4.2** — Feito: linha negativa "Usado em compra na loja" nas 3 contas (saldo intocado; extrato = saldo) e `comprar_com_saldo` passa a gravar essa linha sozinha.
2. **4.5** — Mantido: leilão paga no martelo (o lance reserva o saldo; o martelo é o pagamento).
3. **4.7** — Sem retroativo: a regra Nexus começou em 15/08 e as pessoas foram zeradas em 28/09 por ordem do dono.
4. **4.9** — Feito: a conta oficial sai da regra dos 10% (gatilho) e os R$ 507,70 existentes foram estornados.
5. **4.10** — Mantido: zerar saldo não tira cargo; ninguém sai da rede sem ordem do dono.
