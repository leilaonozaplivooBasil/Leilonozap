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
- **Commit:** `b74accff`
- **Produção:** intocada. **Banco:** intocado. **pg_cron:** intocado.
- **`npm test`:** 195/195 · **`npm run build`:** exit 0 · worktree limpa
- **Merge:** NÃO. Aguarda nova auditoria OpenAI.

**11 primeiros bloqueadores: 11/11 · A1 e A2: corrigidos e travados por regressão ·
B12–B21 da segunda auditoria: 10/10.** Total 23 defeitos fechados nesta branch.
Nenhum chegou a produção.
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
| P1 | ~~Volta segura do `product_id`~~ **RESPONDIDA pelo B16**: era fail-open, virou fail-closed. Resta confirmar se devolver 503 em incidente de rede é o trade-off certo. | OpenAI | ABERTA |
| P2 | `reserveBidBalance` não confere o produto do selo (decisão de latência, não esquecimento). Aceitável? | OpenAI | ABERTA |
| P3 | A RPC 06 — agora com 5 argumentos, montando o documento dentro do `FOR UPDATE` e com `DROP FUNCTION` da versão antiga — está correta para aplicar? | OpenAI | ABERTA |
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

## 2.2 SEGUNDA AUDITORIA — B12 a B21

| # | Defeito | Correção | Prova |
|---|---|---|---|
| B12 | `fetch` **lançando** depois da reserva pulava as checagens de `resp.ok` e caía no catch externo, que não estorna | barreira de compensação: tudo após a reserva sabe o que já foi feito e desfaz na ordem inversa; rollback falho vira `precisa_intervencao` | BR11, BR12, BR12b — `fetch` que **rejeita**, não HTTP 500 |
| B13 | PATCH solto de `frete_reservado_valor`, sem trava; rollback deixava o frete no leilão e contaminava o vencedor real | o frete sai do `frete_amount` do lance vencedor e é gravado **dentro do claim atômico** | BF1 (frete e vencedor na mesma escrita), BF2 (legado ≠ zero), BF3, BF4 |
| B14 | `cotarFrete` emitia autorização financeira em modo observação, e devolvia o CEP do `user_id` do corpo | crachá obrigatório; identidade **do crachá**, nunca do corpo | B14a–B14f, incluindo o teste de vazamento de CEP |
| B15 | selo de CEP antigo valia depois de trocar o endereço | `address_zip_code` no SELECT que já existia; compara com o CEP do selo | B15 ×4, inclusive **apagar** o CEP |
| B16 | volta segura do `product_id` era **fail-open**: qualquer erro desligava a conferência | só `42703` relê sem a coluna; outro erro → 503; com bloqueio, falha **fechado** | B16 ×2 |
| B17 | o estorno usava a conta da tela, não o valor reservado | `reserved_amount` na resposta e na UI | B17 |
| B18 | RPC devolve `ok:false` em **HTTP 200**; a rota dizia "debitado" sem um centavo ter saído | decide pelo resultado **lógico** | B18 ×6 |
| B19 | a RPC gravava o documento que o chamador leu antes da trava — overwrite silencioso | a RPC recebe só o bloco do frete e monta sobre o `raw_base44` lido **dentro** do `FOR UPDATE` | assinatura travada por `deepEqual` |
| B20 | leilão legado identificado por título podia casar dois leilões do mesmo comprador | palpite sugere na conferência, **nunca cobra**; `auction_id` validado contra o comprador | B20 ×4 |
| B21 | `apenas_completar` gravava o serviço **mais barato** num pedido que pagou outro valor | serviço de preço mais próximo do pago (ou escolha do operador), com `valor_recotado`, `diferenca_para_o_pago` e `servico_confirmado_da_cotacao_original: false` | B21 ×4 |

### A1 e A2 são agora invariantes de regressão

Provado por reversão, não por afirmação:

- reverter A1 (voltar `_user_id`/`_actor_id`) → **derruba** `B8 · a chamada da RPC usa a assinatura certa`
- reverter A2 (guarda depois da RPC) → **derruba** `B8 · cobrança travada bloqueia TAMBÉM o caminho da RPC`

**A1 preservado: SIM · A2 preservado: SIM · B12–B21: 10/10**

### Um buraco que eu mesmo abri e fechei no meio do B15

A primeira versão da trava de CEP era
`cepDoSelo && cepAtual && cepDoSelo !== cepAtual`. O `cepAtual &&` deixava passar
quem **apagasse** o CEP do perfil depois de cotar — a comparação nem acontecia.
"Não tenho CEP agora" não prova que o CEP do selo é o certo; prova o contrário.
Achado na revisão do meu próprio diff, antes do commit. Teste próprio.

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

## 4. TESTES — 195, e o que eles provam

| Arquivo | Casos | O que cobre |
|---|---|---|
| `urlSegura.test.mjs` | 46 | SSRF |
| `manageCoupons.test.mjs` | 19 | cupons |
| `cobrarFretePendente.test.mjs` | 42 | B7, B8, B9, B10 + F10/F11/F12 |
| `freteLeilao.test.mjs` | 22 | motor de frete + 7 adversariais do selo (B3) |
| `submitAtomicBuyNow.test.mjs` | 23 | **rotas reais** do Buy Now e da finalização (B1, B2, B6, B12, B13) |
| `reserveBidBalance.test.mjs` | 12 | **rota real** da reserva (B5) |
| `cotarFrete.test.mjs` | 16 | **rota real** da emissão do selo (B3, B14) |
| `integracaoFrete.test.mjs` | 15 | **circuito inteiro** + B15, B16, B17 |

A regra que o dono fixou está cumprida: **todo caminho que movimenta dinheiro
tem teste do handler real.** O único dublê é o `fetch` global.

---

## 5. O QUE A OPENAI PRECISA AUDITAR AGORA

1. **B12** — algum caminho depois da reserva ainda escapa da barreira?
2. **B13** — o frete no claim cobre o cron `finalizeExpiredAuctions` e o pg_cron
   `expire_auctions` do mesmo jeito? (os dois chamam o mesmo motor)
3. **B13 legado** — manter o frete atual do leilão quando `frete_amount` é NULL é
   o fallback certo, ou existe caso em que ele também mente?
4. **B14** — a rota da Loja ficou de fora da exigência de crachá de propósito
   (não emite selo, não vira reserva). Concorda?
5. **B16** — 503 no lugar de fail-open pode derrubar lance em incidente de rede.
   É o trade-off certo?
6. **B19** — a RPC reescrita está correta para aplicar? Assinatura mudou para
   5 argumentos e o arquivo agora traz `DROP FUNCTION` da versão de 4, senão as
   duas sobrecargas deixam o PostgREST ambíguo (PGRST203), que a rota leria como
   "RPC não aplicada".
7. **Residual assumido:** `reserveBidBalance` não confere produto nem CEP (não lê
   o leilão nem o usuário). Quem confere é o `submitAtomicBid`. Decisão de
   latência — dizer se é aceitável.
8. **Residual registrado pela própria OpenAI:** lance e Buy Now seguem com
   `SESSAO_MODO` em observação. Faz parte da frente de autenticação, não desta.

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

**OpenAI faz a auditoria final da frente de frete** sobre os commits
`50bb0233`, `894fe738`, `3a289c47`, `767b3c44`, `fb2d62a2`, `b74accff`, antes de
qualquer merge. Nada vai para produção antes disso.
