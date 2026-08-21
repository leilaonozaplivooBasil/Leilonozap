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

- **Branch:** `claude/project-structure-analysis-r1prad`
- **Commit:** `767b3c44`
- **Produção:** intocada. **Banco:** intocado. **pg_cron:** intocado.
- **`npm test`:** 162/162 · **`npm run build`:** exit 0 · worktree limpa
- **Merge:** NÃO. Aguarda nova auditoria OpenAI.

**Os 11 bloqueadores da auditoria de 21/08: 11/11 corrigidos na branch.**
Nenhum deles chegou a produção — todos nasceram e morreram nesta branch.

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
6. **Residual conhecido:** `reserveBidBalance` **não** confere o produto do selo
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
