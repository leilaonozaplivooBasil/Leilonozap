# CLAUDE → OPENAI HANDOFF

> Canal técnico entre Claude (investigação/implementação) e OpenAI (auditoria
> independente + execução operacional).
> Sem PII, senha, chave, token ou documento (REGRA 2).

## MAPA — comece por aqui

Este arquivo é a **porta única**. Nada precisa ser printado, colado ou explicado
por fora: se aconteceu, está em um destes lugares.

| Onde | O que tem | Regra |
|---|---|---|
| **Este arquivo** | Estado atual, decisões do dono, perguntas abertas, o que falta | Só o estado de AGORA |
| `docs/DIARIO.md` | **Registro de tudo que foi conversado**, em ordem, com data | Só cresce, nunca é podado |
| `docs/PLANO_REMEDIACAO.md` | Plano ordenado de remediação | |
| `docs/OPENAI_RETURN.md` | Devolutivas da OpenAI, na íntegra | |
| `docs/remediacao_NAO_APLICADA/` | SQL preparado e **não aplicado** | Nada aqui rodou |
| `git log` da branch | Cada correção, com o porquê na mensagem | |

**Links diretos** (a OpenAI lê sem precisar de print):

- Handoff: `https://raw.githubusercontent.com/leilaonozaplivooBasil/Leilonozap/claude/project-structure-analysis-r1prad/docs/CLAUDE_HANDOFF.md`
- Diário: `https://raw.githubusercontent.com/leilaonozaplivooBasil/Leilonozap/claude/project-structure-analysis-r1prad/docs/DIARIO.md`

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

### Registro integral da conversa — regra nova, 21/08/2026

> Decisão do dono, nesta data: *"tudo que você conversar comigo tem que estar no
> handoff. Você me comunica aqui, mas coloca no handoff também. Até a nossa
> comunicação. Pra não ter nenhum ruído, eu não precisava ficar printando nada."*

Motivo: o dono estava tirando print do chat para mostrar à OpenAI. Print se
perde, sai fora de ordem, corta o contexto e gera ruído entre as duas IAs.

**O que passa a valer:**

1. **Nada existe só no chat.** Toda resposta que eu der ao dono — análise,
   correção, recusa, dúvida, opinião, discordância — é registrada em
   `docs/DIARIO.md` no mesmo ciclo, antes do push.
2. **A pergunta dele também entra**, resumida com fidelidade, para o registro
   fazer sentido sozinho.
3. **Vale para o desconfortável também.** Erro meu, hipótese derrubada, ideia
   recusada, divergência com a OpenAI: entra igual. Registro filtrado é pior que
   registro nenhum, porque parece completo.
4. **A OpenAI lê o diário, não o print.** Nenhum pedido a ela deve depender de
   algo que só foi dito no chat.
5. **O diário é append-only.** Nunca reescrito, nunca podado, nunca "limpo".

---

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
| 11 | **Nada existe só no chat.** Toda conversa com o dono entra em `docs/DIARIO.md` no mesmo ciclo. Ver seção acima. |
| 12 | Decisão do dono vira linha numerada em **DECISÕES DO DONO** neste arquivo. Nenhuma das duas IAs re-discute decisão já registrada. |
| 13 | Pergunta que espera resposta vira linha numerada em **PERGUNTAS ABERTAS**, com dono da resposta. Não fica solta no meio do texto. |

---

## 1. ESTADO

- **Branch:** `claude/project-structure-analysis-r1prad`
- **Commit:** `767b3c44`
- **Produção:** intocada. **Banco:** intocado. **pg_cron:** intocado.
- **`npm test`:** 162/162 · **`npm run build`:** exit 0 · worktree limpa
- **Merge:** NÃO. Aguarda nova auditoria OpenAI.

**Os 11 bloqueadores da auditoria de 21/08: 11/11 corrigidos na branch.**
Nenhum deles chegou a produção — todos nasceram e morreram nesta branch.

---

## 1.1 DECISÕES DO DONO — registradas, não se re-discute

> REGRA 12. Decisão registrada aqui é ponto final para as duas IAs. Só o dono
> muda, e quando mudar vira linha nova, nunca edição da antiga.

| # | Data | Decisão |
|---|---|---|
| D1 | 21/08 | **Não aceitar lance nem arremate sem frete.** "Vai gerar um problema grande." |
| D2 | 21/08 | Cobrar o frete do saldo do cliente no pedido que veio sem frete — **manualmente**, depois de corrigido, e nunca mais deixar acontecer. |
| D3 | 21/08 | **Não mergear** até a OpenAI reauditar. Ordem: correção → teste da rota real → build → handoff → auditoria → merge. |
| D4 | 21/08 | **Não ligar** `FRETE_MODO=bloquear` agora. |
| D5 | 21/08 | **Não voltar** ao pg_cron/A14 antes de fechar a frente de frete. |
| D6 | 21/08 | Toda etapa termina com handoff atualizado + commit + push, **sem o dono pedir**. |
| D7 | 21/08 | **Tudo que for conversado no chat entra no diário.** Sem print, sem cópia manual. |
| D8 | — | "Não quero que você seja política, quero que você me confronte e seja sênior." |
| D9 | — | "Só corrigir se de fato estiver pendente, sem achismo." Toda afirmação precisa de arquivo:linha. |
| D10 | — | Nunca dizer que o sistema está "100% seguro". |

---

## 1.2 PERGUNTAS ABERTAS — quem deve a resposta

> REGRA 13. Pergunta que espera alguém não fica solta no texto.

| # | Pergunta | Quem responde | Status |
|---|---|---|---|
| P1 | A volta segura do `product_id` no `submitAtomicBid` é aceitável, ou o risco de perder a conferência de produto supera o de matar o lance? | OpenAI | ABERTA |
| P2 | `reserveBidBalance` não confere o produto do selo (decisão de latência, não esquecimento). Aceitável? | OpenAI | ABERTA |
| P3 | A RPC 06, com a invariante nova, está correta para aplicar? | OpenAI | ABERTA |
| P4 | Autorizar a aplicação da RPC 06 no banco? Sem ela a rota **recusa** cobrar o frete pendente. | Dono | ABERTA |
| P5 | Quando ligar `FRETE_MODO=bloquear`? Depende do log da etapa 1 ficar limpo. | Dono | ABERTA |
| P6 | **Parar de mandar print para a OpenAI e mandar só o link do diário?** Ela lê GitHub. O print corta contexto, sai fora de ordem e é trabalho manual do dono. | Dono | ABERTA |
| P7 | **A OpenAI também passa a escrever no diário?** Hoje a devolutiva dela chega por `OPENAI_RETURN.md` e o dono cola. Se ela registrar direto, o diário vira a conversa das três partes, e some o último ponto de perda. | Dono + OpenAI | ABERTA |
| P8 | **Adotar encerramento de ciclo em 5 linhas fixas** (Branch · Commit · Estado · O que mudou de verdade · Quem age agora)? Padroniza o que o dono lê e o que a OpenAI recebe. | Dono | ABERTA |

---

## 2. OS 11 BLOQUEADORES — O QUE FOI FEITO

| # | Defeito | Correção | Prova |
|---|---------|----------|-------|
| B1 | `submitAtomicBuyNow`: `reserva.success` sem checagem e `winnerName` sem declaração → dinheiro reservado + `ReferenceError` no catch que não estorna | checagem e declaração restauradas | 11 dos 17 testes novos falham sem a correção — verificado revertendo |
| B2 | Testes E–H exercitavam o ajudante, não o handler | 17 testes da **rota real** `submitAtomicBuyNow` | `tests/submitAtomicBuyNow.test.mjs` |
| B3 | `cotarFrete` assinava `body.items`/`body.cep` | com `auction_id`, o corpo perde a autoridade: produto de `auctions.product_id`, CEP do cadastro. Selo passa a carregar `product_id` | `tests/cotarFrete.test.mjs` (CF3, CF4) |
| B4 | Tela não mandava selo → `FRETE_MODO=bloquear` recusaria todo lance legítimo | `AuctionRoom` manda `auction_id`+`user_id`, guarda o selo, exige selo na trava de UI; `useBidSubmission` devolve `frete_selo` | `tests/integracaoFrete.test.mjs` IF1 |
| B5 | `reserveBidBalance` movia `body.amount` | servidor calcula `bid_amount` + frete do selo | RB1: ataque `amount: 0.01` |
| B6 | Lance fantasma no Buy Now | todo estorno apaga o `auction_message`; se o DELETE falhar, loga `precisa_intervencao` | BR11, BR12, BR13 |
| B7 | `cobrarFretePendente` cotava com `id: saleId` (F8 de novo) | acha o leilão e cota pelo `product_id`; `settleAuctionWithBalance` passa a gravar `auction_id` no pedido | B7 · id na Melhor Envio |
| B8 | Corrida na marca; `limparMarca()` sobrescrevia gravação boa | tenta a RPC transacional e **recusa** se ela não existir; compensação só com `FRETE_COBRANCA_COMPENSACAO=liberar`; marca com trava; guarda de cobrança travada subiu para antes da RPC | 5 testes B8 |
| B9 | Rota de débito aceitava modo observação | crachá **obrigatório** desde o primeiro deploy, independente de `SESSAO_MODO` | B9 · admin sem crachá = 401 |
| B10 | `apenas_completar` respondia sucesso sem conferir o PATCH | confere e devolve o status | B10 · HTTP 400 e 500 |
| B11 | `delivery_pendente` aceito na tela, recusado no servidor | não ganha botão de etiqueta; ganha aviso "Entrega pendente — completar endereço"; servidor devolve `endereco_incompleto` em vez de "retirada no balcão" | — |

**RPC 06** ganhou a invariante exigida: `(_raw->'frete'->>'valor')::numeric = _valor`
comparado em centavos, mais `delivery_type = 'delivery'`. **Continua NÃO APLICADA.**

---

## 2.1 ACHADOS ALÉM DOS 11 — apareceram ao corrigir, e os dois eram meus

> Não estavam na lista da OpenAI e não estavam na minha. Apareceram porque
> corrigir um bloqueador obrigou a reler o caminho inteiro. Ficam registrados
> aqui para a auditoria conferir, e para nenhuma das duas IAs re-derivar.

### A1 · A chamada da RPC estava com os parâmetros ERRADOS

A assinatura da função é:

```sql
public.cobrar_frete_pendente(_sale_id text, _valor numeric, _raw jsonb, _actor text)
```

A primeira versão da minha chamada mandava
`{ _sale_id, _user_id, _valor, _actor_id }` — dois nomes que **não existem** na
função, e **sem o `_raw`**, que é o pedido inteiro que a função grava.

**O perigo não é o erro em si — é como ele falha.** O PostgREST resolve função
por nome de argumento. Argumento que não existe não dá erro de tipo: dá
`PGRST202 / 404 · Could not find the function`. E o meu código trata 404
exatamente como **"a RPC ainda não foi aplicada no banco"**.

Ou seja: você aplicaria a RPC 06, ela estaria lá funcionando, e a rota
continuaria respondendo *"a cobrança transacional ainda não está aplicada"* para
sempre. Ninguém investigaria — a mensagem seria a esperada. O frete pendente
nunca seria cobrado e a causa ficaria invisível.

**Corrigido:** a chamada agora usa `{ _sale_id, _valor, _raw, _actor }`.
Coberto pelo teste `B8 · a chamada da RPC usa a assinatura certa`, que confere
os nomes dos quatro parâmetros com `deepEqual` nas chaves — de propósito, para
quebrar se alguém renomear um lado sem o outro.

### A2 · A guarda de "cobrança travada" estava DEPOIS da RPC

O bloqueio de pedido com `cobranca_em_andamento` existia só na frente do caminho
de compensação. Quando eu pus a RPC antes dele, a RPC passou a rodar **por cima**
dessa guarda: um pedido com cobrança anterior não terminada — que pode já ter
sido debitado — seria debitado de novo, agora dentro de uma transação, o que
torna o débito duplo *mais* confiável, não menos.

**Corrigido:** a guarda subiu para antes dos dois caminhos.
Coberto por `B8 · cobrança travada bloqueia TAMBÉM o caminho da RPC`, que afirma
`estado.rpcChamadas.length === 0` — prova que a RPC nem chegou a ser chamada.

### Nota de autoria

B1, B7, B11, A1 e A2 são erros meus, introduzidos nesta mesma branch ao corrigir
F6–F12. Nenhum chegou a produção. Registro isso porque a taxa importa para a
auditoria: **cinco defeitos materiais introduzidos em seis commits de correção**
é o argumento mais forte a favor de a OpenAI reauditar antes do merge, e contra
qualquer merge feito com pressa.

---

## 3. O QUE MUDOU DE ARQUITETURA

**O servidor é a única autoridade sobre o frete.** Três lugares decidiam antes;
agora é um só.

1. `cotarFrete` recebe `auction_id` + `user_id`. Lê o leilão, lê o produto, lê o
   CEP do cadastro. **Ignora `items` e `cep` do corpo.** Assina cada opção.
2. O selo (`frete-v1|`, HMAC, 30 min) carrega leilão, pessoa, produto, CEP e
   valor em centavos.
3. `reserveBidBalance` confere o selo e calcula `bid_amount + frete`.
4. `submitAtomicBid` confere o selo **e o produto contra o leilão atual**.
5. `submitAtomicBuyNow` cota no servidor, reserva produto + frete, e sobrescreve
   `frete_reservado_valor` com o do novo vencedor.

**Rollout em duas etapas continua valendo** (`FRETE_MODO`). Sem a variável, aba
antiga passa e o log denuncia. `FRETE_MODO=bloquear` **não foi ligado**.

⚠️ **`submitAtomicBid` continua com UM único import** (`crypto`). Conferido.
O `select` do leilão ganhou `product_id` **com volta segura**: se a coluna não
existir, relê o select antigo e segue sem a conferência de produto — coluna nova
num select transformaria todo lance em 404 (PONTO 83).

---

## 4. TESTES — 162, e o que eles provam

| Arquivo | Casos | O que cobre |
|---|---|---|
| `urlSegura.test.mjs` | 46 | SSRF |
| `manageCoupons.test.mjs` | 19 | cupons |
| `cobrarFretePendente.test.mjs` | 28 | B7, B8, B9, B10 + F10/F11/F12 |
| `freteLeilao.test.mjs` | 22 | motor de frete + 7 adversariais do selo (B3) |
| `submitAtomicBuyNow.test.mjs` | 17 | **rota real** do Buy Now (B1, B2, B6) |
| `reserveBidBalance.test.mjs` | 12 | **rota real** da reserva (B5) |
| `cotarFrete.test.mjs` | 10 | **rota real** da emissão do selo (B3) |
| `integracaoFrete.test.mjs` | 8 | **circuito inteiro** COTAÇÃO→SELO→RESERVA→LANCE |

A regra que o dono fixou está cumprida: **todo caminho que movimenta dinheiro
tem teste do handler real.** O único dublê é o `fetch` global.

---

## 5. O QUE A OPENAI PRECISA AUDITAR AGORA

1. **B1 de verdade morreu?** `api/functions/submitAtomicBuyNow.js` — conferir que
   todo caminho após a reserva estorna E limpa o lance.
2. **B3 fecha mesmo?** `api/functions/cotarFrete.js` — existe algum jeito de o
   corpo influenciar o que é assinado?
3. **B5:** algum caminho ainda reserva por `body.amount` com selo válido presente?
4. **B8:** a RPC 06, com a invariante nova, está correta para aplicar?
5. **A volta segura do `product_id`** no `submitAtomicBid` é aceitável, ou o
   risco de perder a conferência de produto supera o de matar o lance?
6. **A1 e A2 (seção 2.1):** conferir a chamada da RPC contra a assinatura do
   arquivo `06_rpc_cobrar_frete.sql`, e conferir que a guarda de cobrança
   travada cobre os dois caminhos. Foram achados meus, então merecem olho de
   fora.
7. **Residual conhecido:** `reserveBidBalance` **não** confere o produto do selo
   (não lê o leilão, e ler custaria uma ida ao banco no caminho do lance ao
   vivo). Quem confere é o `submitAtomicBid`. Isto é decisão, não esquecimento —
   dizer se é aceitável.

---

## 6. NÃO FOI FEITO — de propósito

- ❌ Merge · ❌ produção · ❌ banco · ❌ `FRETE_MODO=bloquear`
- ❌ RPC 06 aplicada · ❌ cobrança do `ARD5856D19` · ❌ completar o `AR3BEF1939`
- ❌ A14/pg_cron (dois motores de encerramento ainda correndo por minuto)
- ❌ revogação das 9 RPCs · ❌ RLS Livoo · ❌ `wcfg_read`
- ❌ 150 políticas `authenticated_*` · ❌ upload anônimo · ❌ `SESSAO_MODO=bloquear`
- ❌ as 26 senhas em texto puro

Tudo isso segue congelado atrás da frente de frete, por ordem do dono.

---

## 7. RISCO RESIDUAL REGISTRADO

- **DNS rebinding** em `urlSegura.js` — não resolvido, documentado.
- **`reserveBidBalance` sem conferência de produto** — ver item 6 acima.
- **Selo de 30 min** congela o preço da transportadora nesse intervalo. Tolerância
  deliberada, igual à de qualquer carrinho.
- **Migrations drifted**: `supabase/migrations/` nunca foi pipeline. Produção é a
  única fonte de verdade.

---

## 8. DECISÃO PENDENTE DO DONO

1. Aplicar a **RPC 06** (depois da revisão da OpenAI) — é o que destrava a
   cobrança do frete pendente. Hoje a rota **recusa** cobrar sem ela.
2. Ligar **`FRETE_MODO=bloquear`** depois que o log da etapa 1 ficar limpo.

---

## 9. PRÓXIMO PASSO

**OpenAI audita os 4 commits novos** (`50bb0233`, `894fe738`, `3a289c47`,
`767b3c44`) antes de qualquer merge. Nada vai para produção antes disso.
