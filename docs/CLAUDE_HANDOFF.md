# CLAUDE → OPENAI HANDOFF

> Canal técnico entre Claude (investigação/implementação) e OpenAI (auditoria
> independente + execução operacional). Contém **somente o estado atual**.
> Sem PII, senha, chave, token ou documento (REGRA 4).

## 0. PROTOCOLO OPERACIONAL PERMANENTE

> **Esta seção é fixa.** Ela NÃO é estado e NÃO entra na regra de "somente o
> estado atual" — nunca deve ser podada quando o resto do arquivo for reescrito.
> Vigora a partir de 21/08/2026, por decisão do dono.

### Encerramento automático de etapa

Toda etapa relevante — investigação, confronto com a OpenAI, implementação,
revisão, teste, diagnóstico, preparação de SQL, análise de resultado — só é
considerada encerrada depois de:

1. atualizar este arquivo com o estado novo;
2. `git commit` **somente** deste arquivo;
3. `git push` na branch de trabalho.

**Não esperar o dono pedir para publicar.** A pergunta "você publicou?" não deve
mais precisar existir.

### Resposta ao dono no fim de cada etapa

Somente isto, nada além:

```
HANDOFF PUBLICADO

Branch:
Commit:
Estado:

OpenAI deve:
<próxima ação em uma frase>
```

### Regras fixas

| # | Regra |
|---|---|
| 1 | O handoff contém **somente o estado atual** (exceto esta seção 0). Sem histórico acumulado. |
| 2 | **Nunca** colocar secret, token, senha, chave de serviço, documento de KYC, CPF, chave PIX ou PII individual. Resultado sempre resumido de forma segura. |
| 3 | SQL `READ_ONLY` pode ser encaminhado direto para a OpenAI executar. |
| 4 | SQL que altere produção deve vir marcado `WRITE_PRODUCTION` ou `DDL_MIGRATION`, com objetivo, risco e rollback. |
| 5 | **Não pedir ao dono** para abrir o SQL Editor, rodar consulta, copiar resultado ou mandar print quando a OpenAI puder fazer. Colocar a consulta aqui. |
| 6 | Divergência entre Claude e OpenAI → registrar, **parar**, e não alterar produção até resolver. |
| 7 | Autorização de escrita de Claude em modo leitura: **apenas este arquivo**, na branch de trabalho. Nunca código, banco, produção, merge, deploy ou `main`. |
| 8 | Nunca assumir que commit chegou em produção. Registrar separadamente: COMMIT CRIADO · PR CRIADO · PR MERGEADO · DEPLOY PREVIEW · DEPLOY PRODUÇÃO. |
| 9 | Fontes de verdade: **Supabase** para o estado do banco, **Vercel** para produção, **GitHub** para código e histórico. Arquivo versionado é intenção, não estado. |
| 10 | Antes de alteração estrutural: snapshot → correção → teste → rollback disponível → validação independente. |

---

## 1. ESTADO

Data/hora: **2026-08-21 06:40 UTC**

Branch: `claude/project-structure-analysis-r1prad`
Base: `56efd74b` · Head: `e7547441` (+ o commit deste handoff)
Main conhecida: `56efd74b8efbd49f18d16c44b6e26c247622b8f4`

Modo: **IMPLEMENTAÇÃO EM BRANCH · PRODUÇÃO INTOCADA**

```
Produção alterada ..... NÃO      Banco alterado ........ NÃO
main alterada ......... NÃO      Merge ................. NÃO
Deploy produção ....... NÃO      pg_cron ............... NÃO tocado, segue ATIVO
RLS ................... intocada 9 revogações .......... NÃO executadas
Nenhum saldo de cliente foi debitado. Nenhum pedido foi alterado em produção.
```

`npm run build` exit 0 · `npm test` **73/73** · worktree limpa.

---

## 2. O QUE FOI ANALISADO

Mudança de frente a pedido do dono: **defeito funcional no fluxo
arremate → frete → etiqueta**, encontrado por ele na tela de Gestão de Pedidos.

Sintomas relatados: mesmo comprador, dois arremates com 3 minutos de diferença —
um com `Frete: R$ 11,60`, outro sem frete nenhum. E o botão "Etiqueta" respondia
*"Pedido é retirada no balcão, não precisa de etiqueta"* nos dois.

---

## 3. ACHADOS — não era um defeito, eram cinco

### F1 · As duas pontas discordam do `delivery_type` ausente · **atinge 100% dos arremates**

```
FRONT  CatalogOrdersAdmin.jsx:149   if ((raw?.delivery_type || '') === 'pickup') return false;
BACK   melhorEnvioShipment.js:151   if (raw.delivery_type !== 'delivery') return { skipped:'retirada_na_loja' };
```

E `settleAuctionWithBalance.js:178` **nunca gravava `delivery_type`**. Ficava
`undefined`: o front mostrava "Etiqueta pendente" com botão, o back respondia
"retirada no balcão". Os dois certos pela própria regra.
Pedido da Loja não sofria disso — `createMPPix.js:139` e `payWithBalance.js:78`
gravam. Só o arremate ficou de fora.

### F2 · Sem frete, o pedido nascia sem `raw_base44` nenhum

```js
...(freteAmount > 0 ? { raw_base44: {...} } : {}),
```
Frete zero ⇒ o objeto inteiro deixava de existir. Sem frete, sem
`amount_charged`, sem nada. É o `ARD5856D19`.

### F3 · Mesmo o arremate COM frete jamais geraria etiqueta

O frete ia como `{ valor: 11.60 }` só. `melhorEnvioShipment.js:154` exige
`frete.id` ou devolve `sem_frete_id`. Sem `empresa`/`servico` também — por isso
a tela mostrava "Frete: R$ 11,60" sem transportadora, enquanto o pedido da Loja
mostra "Correios SEDEX".

### F4 · O arremate não gravava endereço de entrega

`getEndereco` não achava nada. A Melhor Envio precisa do endereço.

### F5 · **CAUSA RAIZ** — o lance saía mesmo com o frete falhado

```
submitAtomicBid.js:168   const freteValor = Math.max(0, parseFloat(body?.frete_valor) || 0);   ← vem do NAVEGADOR
AuctionRoom.jsx:499-509  erro de cotação → setFreteValor(0) · sem CEP → setFreteValor(0)
AuctionRoom.jsx:1209     freteStatus só era usado para EXIBIR
handleSubmitBidComTermo  conferia abertura do leilão e aceite do termo — nada sobre frete
```

Cotação falhou, CEP fora do cadastro, ou clique antes de a cotação assíncrona
voltar ⇒ lance sai com frete 0 e **a empresa paga a transportadora do próprio
bolso**.

---

## 4. HIPÓTESES AINDA NÃO PROVADAS

1. **Qual das duas explicações vale para o `ARD5856D19`:** (a) corrida com o
   clique — a cotação é assíncrona e os lances têm 3 min de diferença; ou (b) o
   produto do REPELENTE sem dimensões, fazendo `cotarFrete` voltar vazio.
   `05_arremates_sem_frete_leitura.sql` responde.
2. **Quantos outros arremates estão nessa situação** e quanto de frete a empresa
   já absorveu. Mesma consulta.
3. `pg_cron` × Vercel (A14) segue aberto — ver `00_dano_A14_leitura.sql`.

---

## 5. ALTERAÇÕES REALIZADAS

Tudo na branch. **Nada em produção.**

| Commit | O quê |
|---|---|
| `f0ae8d46` | arremate nasce com `delivery_type`, endereço, telefone, CPF e frete completo · front e back alinhados no mesmo critério (F1–F4) |
| `3b21010e` | **bloqueia lance e "arremate agora" sem frete cotado** (F5) |
| `e7547441` | rota `cobrarFretePendente` + 13 testes |

### Uma decisão de engenharia que precisa ficar registrada

O caminho óbvio para F3 seria o lance já gravar `id`/`empresa`/`serviço`.
**Não dá.** O PATCH do lance (`submitAtomicBid.js`) não aceita campo que não
exista na tabela — coluna inexistente ali faz o PostgREST devolver `42703` e
**todo lance morre**. Foi o que derrubou a produção de 03/08 15:03 até o
PONTO 83, e está no cabeçalho daquele arquivo. Então o detalhe do frete é
resolvido na **liquidação**, recotando com o CEP do vencedor só para descobrir
o `id` do serviço.

**O valor cobrado não muda:** quem manda é `frete_reservado_valor`, o que o
cliente viu e teve reservado. Se a recotação falhar, o pedido nasce com o valor
certo e sem `id` — vira etiqueta pendente, que é problema de logística, não de
dinheiro. E sem endereço utilizável o pedido nasce `pickup`, para não ficar
pendurado numa pendência impossível.

### `cobrarFretePendente` — as travas, cada uma com teste

- **modo padrão é conferência.** Mostra valor, serviço, saldo e quanto falta, e
  **não debita**. Cobrar de verdade exige `executar: true`. Debitar saldo de
  cliente não pode acontecer por clique errado.
- só admin conferido no banco · não cobra duas vezes · **não deixa saldo
  negativo** · sem endereço completo, recusa · débito por compare-and-swap (se o
  saldo mudou no meio, não cobra **e não grava o frete no pedido**) · **não toca
  em `total_amount`** — frete nunca comissiona · registra quem cobrou, quando e
  por quê, dentro do pedido e no `wallet_ledger`.

---

## 6. AÇÃO NECESSÁRIA DA SEGUNDA IA

1. **Executar `05_arremates_sem_frete_leitura.sql`** (READ_ONLY) — quantos
   arremates sem frete existem e quanto a empresa já absorveu.
2. **Auditar os 3 commits.** Em especial `e7547441`: a rota debita saldo de
   cliente. Procurar caminho em que ela debite sem gravar, grave sem debitar, ou
   cobre duas vezes.
3. **Contestar a decisão de recotar na liquidação** em vez de gravar no lance,
   se enxergar caminho melhor que não mexa no PATCH do lance.
4. **Conferir se `wallet_ledger` aceita `tipo = 'cobranca_frete_pendente'`** —
   se houver constraint de enum, o lançamento falha em silêncio (é best-effort,
   não derruba a cobrança, mas a trilha some).
5. Segue pendente: `00_dano_A14_leitura.sql` (pg_cron × Vercel).

---

## 7. SQL PARA EXECUÇÃO

TIPO: **READ_ONLY** · RISCO: **ZERO**
Arquivo: `docs/remediacao_NAO_APLICADA/05_arremates_sem_frete_leitura.sql`
(3 consultas: arremates por situação · os sem frete um a um, com o
`frete_reservado_valor` que estava no leilão · leilões encerrados com frete zero)

---

## 8. ROLLBACK

Código: `git revert` de cada commit — os três são independentes.
`cobrarFretePendente` **não tem rollback automático**: se um débito for feito por
engano, devolver o saldo é operação manual e deliberada. Por isso o modo padrão
é conferência.

---

## 9. O QUE A SEGUNDA IA PRECISA TE DEVOLVER

- resultado das 3 consultas — **quantos arremates e quanto dinheiro**
- crítica ao `e7547441`, caminho a caminho de dinheiro
- se `wallet_ledger.tipo` tem constraint
- se o `ARD5856D19` bate com a hipótese (a) corrida ou (b) produto sem dimensões

**REGRA 4:** contagens, ids de pedido e valores agregados. Nenhum dado de pessoa.

---

## 10. DECISÃO PENDENTE DO DONO

### Do fluxo de frete

1. **Merge do PR** — enquanto não subir, todo arremate novo continua nascendo
   sem `delivery_type` e o lance sem frete continua passando.
2. **Cobrar o frete do `ARD5856D19`.** A rota está pronta. O caminho é: rodar em
   **conferência** primeiro (mostra valor e saldo, não debita), você olhar, e só
   então repetir com `executar: true`. **Eu não executo isso sem sua palavra —
   é dinheiro de cliente.**
3. **O `AR3BEF1939`** (o que tem R$ 11,60) precisa que o `delivery_type` e o
   `frete.id` sejam preenchidos para a etiqueta sair. É correção de dado, não de
   código. Preparo o SQL quando você pedir.

### Da segurança, ainda em aberto

`pg_cron` × Vercel · revogar as 9 RPCs · RLS Livoo · `wcfg_read` · 150 policies
`authenticated_*` · upload anônimo. Ordem completa em
`docs/PLANO_REMEDIACAO.md`, seção K.

---

## 11. PRÓXIMO PASSO RECOMENDADO

Rodar `05_arremates_sem_frete_leitura.sql` para saber se o `ARD5856D19` é caso
isolado ou a ponta de uma série — porque isso muda se a conversa é "cobrar um
frete" ou "reconciliar um prejuízo acumulado".
