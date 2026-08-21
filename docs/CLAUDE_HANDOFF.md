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

Data/hora: **2026-08-21 07:20 UTC**

Branch: `claude/project-structure-analysis-r1prad`
Base: `56efd74b` · Head: `e8b46e0e` (+ o commit deste handoff)
Main conhecida: **`9b0659f3`** — a main andou (PRs #68, #69, #70). **Sem conflito**, verificado.

Modo: **IMPLEMENTAÇÃO EM BRANCH · PRODUÇÃO INTOCADA**

```
Produção alterada ..... NÃO      Banco alterado ........ NÃO
main alterada ......... NÃO      Merge ................. NÃO
pg_cron ............... NÃO tocado    RLS ............... intocada
Nenhum saldo debitado. Nenhum pedido alterado. Cobrança do ARD5856D19 NÃO executada.
```

`npm run build` exit 0 · `npm test` **98/98** · worktree limpa.

---

## 2. O QUE FOI ANALISADO

Confrontação de F6–F12 e reconstrução da arquitetura de frete: lance normal,
Buy Now, liquidação, pedido e cobrança de legado.

---

## 3. ACHADOS

### 🔴 HIPÓTESES MINHAS DERRUBADAS — a OpenAI achou a causa raiz real

| Minha hipótese | Veredito |
|---|---|
| (a) corrida da cotação assíncrona | **DERRUBADA** como causa principal |
| (b) produto sem dimensões | **DERRUBADA** como causa principal |

**Os dois pedidos foram ARREMATE RÁPIDO (Buy Now), não lance normal.** O
histórico mostra `🔥 ARREMATE RÁPIDO!` com `frete_amount = 0` nos dois. Meu
diagnóstico F5 descrevia um caminho que existe e é real, mas **não é o que
produziu esses pedidos**.

### CAUSA RAIZ REAL — F6

`submitAtomicBuyNow.js` reservava `buyNowPrice` (só o produto), criava o lance
com `frete_amount: 0` e **nunca tocava em `auctions.frete_reservado_valor`**.

```
ARD5856D19   leilão sem líder anterior  → frete_reservado_valor = 0
                                        → arremate com frete ZERO
                                        → a empresa paga a transportadora

AR3BEF1939   lance anterior R$ 6,80 + frete R$ 11,60 (outro CEP)
             → Buy Now R$ 10,00 com frete_amount = 0
             → mas o leilão manteve frete_reservado_valor = 11,60
             → o pedido HERDOU R$ 11,60 que o Buy Now nunca calculou
```

Os dois resultados aparentemente contraditórios, a mesma causa.

### F7–F12 — todos confirmados, e **F8 a F12 eram erros meus**

| | Achado | Status |
|---|---|---|
| F7 | `freteBloqueia` é só UX; `submitAtomicBid` seguia lendo `body.frete_valor` | **confirmado** |
| F8 | `montarRawArremate` cotava por `auction.id`, caindo na caixa mínima dos Correios | **confirmado — meu erro** |
| F9 | entrega paga virava `pickup` silencioso quando faltava endereço | **confirmado — meu erro** |
| F10 | débito + gravação sem verificação: saldo debitado com pedido intacto | **confirmado — meu erro** |
| F11 | rota atuava sobre qualquer `catalog_sale`, não só arremate | **confirmado — meu erro** |
| F12 | valor manual virava direto o cobrado | **confirmado — meu erro** |

E um que **o próprio código me entregou durante a correção**: com a reserva
virando produto + frete, os **três** `estornar(userId, buyNowPrice)` deixariam o
frete preso na reserva do cliente para sempre. Corrigidos para `totalReservar`.

---

## 4. HIPÓTESES AINDA NÃO PROVADAS

1. **Quantos outros arremates estão sem frete.** `05_arremates_sem_frete_leitura.sql`
   segue sem rodar. Agora sabemos que o filtro certo é **Buy Now**, não lance.
2. A14 / `pg_cron` × Vercel — congelado a pedido, para fechar o frete primeiro.

---

## 5. ALTERAÇÕES REALIZADAS — 6 commits

| Commit | O quê |
|---|---|
| `b767ff33` | `freteLeilao.js` (motor único, cota por `product_id`) + `freteSelo.js` (HMAC) + `cotarFrete` assinando as opções |
| `3a155e8f` | **F6** — Buy Now reserva produto+frete, grava `frete_amount` e sobrescreve `frete_reservado_valor` |
| `ef15223f` | **F7** — o frete do lance vem do selo do servidor, com rollout em duas etapas |
| `a8982b93` | **F8/F9** — cota pelo produto certo; `delivery_pendente` em vez de `pickup` silencioso |
| `7af0ef52` | **F10/F11/F12** — três passos verificados com compensação; escopo `kind='arremate'`; override com justificativa |
| `e8b46e0e` | 30 testes novos (A–R) |

### A decisão de arquitetura, e por que não foi "recotar dentro do lance"

`submitAtomicBid.js` e `reserveBidBalance.js` são **autocontidos por lei** —
import de 2 níveis já derrubou o lance em produção. E pôr uma chamada de rede à
Melhor Envio no caminho do lance é somar latência e ponto de falha externo num
leilão ao vivo com gente clicando no mesmo segundo.

Então: **`cotarFrete` assina cada opção com HMAC; o lance só confere a
assinatura.** `crypto` já está importado lá. Sem rede, sem import novo.
Verificado: `submitAtomicBid.js` continua com **um único import**.

É o mesmo desenho do crachá de sessão, pelo mesmo motivo — o dado se prova
sozinho.

**Rollout em duas etapas**, igual ao crachá e ao webhook do MP: enquanto
`FRETE_MODO` não for `bloquear`, lance sem selo válido **passa e fica no log**.
Ligar direto recusaria toda aba já aberta, no meio de leilão ao vivo.

### O que ainda é compensação, e não transação

`cobrarFretePendente` faz três escritas verificadas com estorno. Funciona e está
testado — mas se o processo morrer entre o débito e o estorno, sobra pendência
manual. A RPC transacional de verdade está em
`docs/remediacao_NAO_APLICADA/06_rpc_cobrar_frete.sql`, **não aplicada**, com
`FOR UPDATE` nas duas linhas, `REVOKE` antes do `GRANT` e rollback documentado.

---

## 6. AÇÃO NECESSÁRIA DA SEGUNDA IA

1. **Auditar os 6 commits antes de qualquer merge.** Prioridade: `3a155e8f`
   (Buy Now, mexe em reserva de saldo) e `7af0ef52` (debita cliente).
2. **Atacar o selo.** É a peça nova que sustenta a trava financeira: dá para
   forjar, reusar em outro leilão, reusar depois de vencido, ou fazer o lance
   aceitar `frete_valor` do corpo com `FRETE_MODO=bloquear` ligado?
3. **Revisar `06_rpc_cobrar_frete.sql`** — o `FOR UPDATE` nas duas linhas cobre
   as corridas? Falta algum caminho de erro?
4. **Rodar `05_arremates_sem_frete_leitura.sql`** — agora com a leitura certa:
   procurar por Buy Now, não por lance.
5. Dizer se concorda com o rollout em duas etapas do `FRETE_MODO` ou se acha
   que deve nascer bloqueando.

---

## 7. SQL PARA EXECUÇÃO

TIPO: **READ_ONLY** · RISCO: **ZERO**
`docs/remediacao_NAO_APLICADA/05_arremates_sem_frete_leitura.sql`

Mais esta, para separar Buy Now de lance normal nos pedidos sem frete:

```sql
SELECT s.id, s.tracking_code, s.product_title, s.total_amount, s.created_date,
       COALESCE((s.raw_base44 -> 'frete' ->> 'valor')::numeric, 0) AS frete_no_pedido,
       EXISTS (SELECT 1 FROM public.auction_messages m
                WHERE m.sender_id = s.buyer_id
                  AND m.content ILIKE '%ARREMATE RÁPIDO%'
                  AND m.bid_amount = s.total_amount) AS foi_buy_now
FROM public.catalog_sales s
WHERE s.kind = 'arremate'
  AND COALESCE((s.raw_base44 -> 'frete' ->> 'valor')::numeric, 0) = 0
ORDER BY s.created_date DESC LIMIT 200;
```

---

## 8. ROLLBACK

Código: `git revert` — os 6 commits são independentes.
RPC: não aplicada; o `DROP` está comentado no próprio arquivo.
`FRETE_MODO`: não publicado; apagar a variável volta à etapa 1.

---

## 9. O QUE A SEGUNDA IA PRECISA TE DEVOLVER

- crítica ao selo (`freteSelo.js`) — tentativa real de forjar ou reusar
- crítica ao `3a155e8f` e ao `7af0ef52`, caminho a caminho de dinheiro
- crítica ao `06_rpc_cobrar_frete.sql`
- resultado das consultas: **quantos arremates sem frete, e quantos foram Buy Now**
- posição sobre o rollout em duas etapas do `FRETE_MODO`

**REGRA 4:** contagens, ids de pedido, valores agregados. Nenhum dado de pessoa.
**REGRA 12:** divergiu → registrar e parar.

---

## 10. DECISÃO PENDENTE DO DONO

1. **Merge do PR.** Enquanto não subir, **todo Buy Now continua nascendo sem
   frete** — o defeito está em produção agora.
2. **`FRETE_MODO=bloquear`** — depois do log limpo, não junto do merge.
3. **Cobrança do `ARD5856D19`** — não executada. Roda em conferência primeiro.
4. **Completar o `AR3BEF1939`** — `apenas_completar`, sem cobrar nada.
5. **Aplicar a RPC `06`** — opcional; a compensação já funciona.

---

## 11. PRÓXIMO PASSO RECOMENDADO

OpenAI ataca o selo e audita os dois commits que mexem em dinheiro
(`3a155e8f`, `7af0ef52`), porque o merge dessa frente é urgente — o Buy Now
está em produção nascendo sem frete — e a pressa é justamente o que costuma
deixar passar defeito em código de dinheiro.
