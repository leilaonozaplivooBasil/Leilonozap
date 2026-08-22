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
| `docs/DIRETIVA_ATUAL.md` | A diretiva de engenharia **em vigor agora** — o que está autorizado nesta rodada | Substituída a cada diretiva nova; a anterior vai pro histórico |
| `docs/HISTORICO_DIRETIVAS.md` | Log append-only de **toda diretiva formal** já emitida, com resultado | Só cresce, nunca é podado |
| `docs/ARQUITETURA.md` | Referência de arquitetura — como o sistema é montado, não o que está sendo corrigido agora | Atualizado só quando algo estrutural muda de verdade |
| `docs/PLANO_REMEDIACAO.md` | Plano ordenado de remediação | |
| `docs/OPENAI_RETURN.md` | Devolutivas da OpenAI, na íntegra | |
| `docs/remediacao_NAO_APLICADA/` | SQL preparado e **não aplicado** | Nada aqui rodou |
| `git log` da branch | Cada correção, com o porquê na mensagem | |

**Links diretos** (a OpenAI lê sem precisar de print):

- Handoff: `https://raw.githubusercontent.com/leilaonozaplivooBasil/Leilonozap/claude/project-structure-analysis-r1prad/docs/CLAUDE_HANDOFF.md`
- Diário: `https://raw.githubusercontent.com/leilaonozaplivooBasil/Leilonozap/claude/project-structure-analysis-r1prad/docs/DIARIO.md`
- Diretiva atual: `https://raw.githubusercontent.com/leilaonozaplivooBasil/Leilonozap/claude/project-structure-analysis-r1prad/docs/DIRETIVA_ATUAL.md`
- Histórico de diretivas: `https://raw.githubusercontent.com/leilaonozaplivooBasil/Leilonozap/claude/project-structure-analysis-r1prad/docs/HISTORICO_DIRETIVAS.md`
- Arquitetura: `https://raw.githubusercontent.com/leilaonozaplivooBasil/Leilonozap/claude/project-structure-analysis-r1prad/docs/ARQUITETURA.md`

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

### PROTOCOLO-MESTRE DE COMANDO E EXECUÇÃO — 21/08/2026

> Decisão do dono, nesta data. Regra central: **ACELERAR COM MAIS SEGURANÇA.**
> Métrica principal do projeto passa a ser **TEMPO DO PEDIDO → PRODUÇÃO SEGURA**
> — não quantidade de análises, commits, handoffs ou tokens.

**Primeira resposta a todo pedido do dono** traz, nesta ordem:
`ENTENDI QUE VOCÊ QUER` · `TIPO` · `RISCO` · `MODELO RECOMENDADO` · `MOTIVO` ·
`CUSTO RELATIVO` · `PROMPT PARA EXECUÇÃO`.
O dono não precisa escrever especificação técnica — a IA traduz a intenção.
Tamanho do prompt proporcional à complexidade.

**Roteamento de modelo** (escolher ANTES de executar, e pode trocar no meio):

| Modelo | Quando | Nunca |
|---|---|---|
| **Haiku 4.5** | busca, localizar função, formatação, doc curta, alteração determinística | dinheiro, segurança, concorrência, autorização, arquitetura crítica |
| **Sonnet 5** | **padrão de engenharia**: implementação, debug, refactor, testes, API, front, back, revisão | — |
| **Opus 5** | arquitetura crítica, segurança profunda, dinheiro, concorrência, autorização, bug sistêmico, auditoria final de mudança crítica, Sonnet travado | renomear arquivo, buscar função, doc simples, CSS pequeno |

Escalar Sonnet→Opus quando travar de verdade (não repetir 5× a mesma abordagem).
Descalar Opus→Sonnet/Haiku quando sobrar só doc, teste mecânico e ajuste simples.

**Classificação de achado de auditoria** — só três caixas:

- **BLOCKER** — impede merge/deploy. Só com risco concreto: perda financeira,
  saldo preso, cobrança errada ou duplicada, fraude, bypass de auth,
  corrupção de dados, pedido inconsistente, indisponibilidade grave, rollback
  perigoso, ou falha diretamente ligada à mudança atual.
- **FOLLOW-UP** — importante, não impede a entrega. Registra, **não bloqueia**.
- **OBSERVAÇÃO** — melhoria futura. Registra se relevante, não interrompe.

**Ciclo máximo, sem loop infinito:**
`IMPLEMENTAÇÃO → AUDITORIA → CORREÇÃO DE BLOCKERS → FINAL CHECK`.
`BLOCKERS = 0` ⇒ `PRONTO PARA MERGE = SIM`. Follow-up **não reabre** o incidente.

**Vocabulário obrigatório (REGRA 16).** Nunca dizer "está corrigido" para o que
está só na branch:
`CORRIGIDO NA BRANCH → MERGEADO → DEPLOYADO → VALIDADO EM PRODUÇÃO → RESOLVIDO`.

**Não são prova de conclusão:** handoff publicado, commit criado, N testes
verdes, build verde, preview disponível. São evidências intermediárias.

**Relatório ao dono** é curto e executivo: OBJETIVO · STATUS % · MODELO EM USO ·
PRODUÇÃO SIM/NÃO · FEITO (≤5) · BLOCKERS · FOLLOW-UPS · PRONTO PARA MERGE ·
PRÓXIMO PASSO · PRÓXIMO CHECKPOINT. **Percentual nunca é maquiado** — se faz duas
horas que se investiga e produção segue 0%, o relatório diz 0%.

**Não expandir escopo em incidente** (REGRA 9): problema novo não relacionado vai
para backlog como follow-up; a correção em curso não para.

---

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
| D11 | 21/08 | **PROTOCOLO-MESTRE ativado.** Acelerar com mais segurança. Métrica = tempo do pedido → produção segura. Roteamento de modelo por risco. Achado vira BLOCKER / FOLLOW-UP / OBSERVAÇÃO. Ciclo máximo: implementação → auditoria → blockers → final check. |
| D12 | 21/08 | **Não iniciar nova auditoria estrutural** antes de a correção do frete estar em produção e validada. A14/pg_cron, RLS e o resto seguem congelados. |

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

---

## 10. FRENTE SEPARADA — GESTÃO DE PEDIDOS (21/08/2026)

> Aberta pelo dono no mesmo dia, depois da frente de frete estar mergeada em
> produção (PR #74 e #77). Sem relação com a auditoria da OpenAI acima —
> registrada aqui porque o dono pediu explicitamente um resumo no handoff.
> Histórico completo, com print e mensagem do dono em cada passo, no
> `docs/DIARIO.md` (seções "Gestão de Pedidos" e "PONTO 11x").

**Pedido original do dono:** revisar toda a tela de gestão de pedidos
(`CatalogOrdersAdmin.jsx`) — renomear "Completar entrega" pra apontar pra
retirar etiqueta, sincronizar com o Melhor Envio, comunicação de "etiqueta
enviada", passo de etiqueta na Jornada da Entrega, e **corrigir o "Erro ao
atualizar pedido"** que ele via ao vivo. Autorizado com "PODE", priorizando
o bug de salvar primeiro.

**O que foi mergeado e deployado em produção, nesta ordem, cada um achado ao
vivo pelo dono testando o anterior:**

| Ponto | O que quebrava | Correção | PR / commit em `main` |
|---|---|---|---|
| **115** | Rota genérica `entityWrite` deixava editar `status`/valores de venda por fora das regras de negócio (estorno, comissão) | Bloqueou escrita de `status` e afins em `catalog_sales` por essa rota | (mesma sessão, antes desta lista) |
| **116** | O bloqueio do 115 quebrou o salvamento manual de status na tela — "Erro ao atualizar pedido" em toda venda | `handleSaveOrder` passou a chamar a rota dedicada `updateOrderStatus`; ela passou a aceitar os dois vocabulários (inglês/português) que o sistema usa pro mesmo status | PR #78 · `e4437e74` |
| **117** | `status` (aba/contador) e `fulfillment_status` (Jornada da Entrega, o que o comprador vê) eram campos separados que não se falavam — marcar "Entregue" na Jornada não movia a aba | `updateOrderStatus` passou a gravar os dois juntos, com mapeamento nos dois sentidos | PR #79 · `d88b479c` |
| **118** | A correção do 117 também removeu um atalho real (digitar rastreio promovia sozinho pra "Enviado") | Restaurada, mas só quando o rastreio **muda** de verdade | PR #80 · `5ef23387` |
| **119** | A regra do 118 ainda dependia de inferir intenção pelo conteúdo de um campo de texto — confundiu de novo em outro caso real | **Fim da inferência.** Status salvo é sempre, literalmente, o que está selecionado no dropdown. Sem exceção | PR #81 · `e296d56a` |

**Testes:** 204 → 219 (líquido, depois de remover os 6 testes do PONTO 118
que testavam o comportamento que o PONTO 119 removeu). `npm run build` exit
0 em todos os 4 PRs.

**Risco de processo, registrado pra não repetir (e não é da OpenAI, é meu
com o `git`):** este repo faz **squash merge** — cada PR vira commit novo em
`main`, sem herança dos commits originais da branch. Duas vezes nesta
frente, continuar commitando na branch sem resetar pro `main` atual gerou
"conflito" falso no GitHub (305 arquivos, sem diferença real de conteúdo —
confirmado por `git diff` vazio). Corrigido com `git checkout -B` na branch
a partir de `origin/main` + `git cherry-pick` só dos commits ainda não
mesclados + `push --force-with-lease` com o SHA remoto conferido antes.
Virou rotina: resetar a branch logo depois de cada merge.

**Status agora:** **MERGEADO e DEPLOYADO** (commit `e296d56a`, CI verde,
Vercel confirmou "Deployment has completed"). **NÃO VALIDADO EM PRODUÇÃO** —
o dono ainda vai testar de novo ao vivo depois deste último ajuste.

**O que falta desta frente, ainda não iniciado:** renomear/reformular
"Completar entrega" pra apontar pra retirar a etiqueta; investigar se o
Melhor Envio oferece webhook (hoje **confirmado que não existe nada disso no
código** — nenhum webhook, nenhuma consulta automática; falta checar a
documentação oficial deles); comunicação de "etiqueta enviada"; passo de
etiqueta na Jornada da Entrega; proposta de redesenho da tela inteira, a
apresentar ao dono antes de qualquer implementação ampla.

---

## 11. AUDITORIA SOMENTE-LEITURA — PR #86/#87, pedido feito pela OpenAI (21/08/2026)

> A OpenAI abriu duas branches/PRs próprias sobre a frente de Gestão de
> Pedidos: `openai/catalog-status-sync` (**PR #86**, destino de produção,
> `head 65a82898`) e `openai/catalog-status-sync-preview` (**PR #87**, harness
> de staging isolado, `head 9797f7cb`, aponta pro Supabase `preview-staging`
> — project ref `obipnfhwiaafxeqgfeop`, NÃO é o projeto de produção
> `gezvviyegtxytnwjkrjv`). Pediu auditoria técnica completa, somente leitura,
> sem nenhuma alteração de código, comparando as duas contra `main`. Resposta
> completa abaixo — nenhum arquivo foi tocado nesta rodada.

**Verificação antes de confiar no que a mensagem descrevia (REGRA 9):**
confirmei via `list_branches` e `pull_request_read` que as duas branches e
as duas PRs existem de verdade, ambas draft, ambas abertas pela conta
`leilaonozaplivooBasil`, base `main@e296d56a` (o commit que acabei de
deployar nos PONTOs 116-119). **Não conectei a nenhum projeto Supabase**
(nem o `preview-staging`) — REGRA 13, nunca tocar projeto sem confirmação
explícita de qual é o certo. Isso limita a certeza de duas partes da
auditoria (ver achado C abaixo), marcadas como não confirmadas.

### 🔴 Achado crítico, fora da lista pedida: harness de admin fake por hostname

`src/api/plataformaClient.js` na PR #87 loga **qualquer visitante** como
admin (`localStorage.currentUser = {id:'preview-admin', role:'admin', ...}`)
só porque o hostname termina em `.vercel.app` — **todo** deploy de preview
deste projeto cai nesse padrão, não só esta branch. `src/api/supabaseClient.js`
na mesma PR reaponta **todo** tráfego Supabase pro staging sob a mesma
condição, com a chave publicável do staging hardcoded no arquivo. Já está
coberto pela própria regra da OpenAI de não mergear a #87 — registrado aqui
com força porque é o tipo de código que sobrevive um merge acidental e vira
bypass de autenticação em produção.

### Causas-raiz das 3 regressões pedidas

| # | Sintoma (print do dono) | Causa raiz | Arquivo/função |
|---|---|---|---|
| A | Checkbox de conferência → "Erro ao salvar" | `handleTogglePacked` manda `{raw_base44}` (1 chave, confirmado no código); no Preview isso passa por um Proxy que só libera se `id === 'preview-order-status-sync'` literal — qualquer outro id, ou falha na Edge Function `preview-api`, ou CORS — tudo vira o mesmo toast genérico, que **engole `error.message`** | `CatalogOrdersAdmin.jsx:370` + `plataformaClient.js` (PR #87) |
| B | Jornada = "Pedido recebido" com Status = "Preparando" | Causa raiz é **minha** (gap do PONTO 117): o dropdown de status só tem itens em inglês, mas `updateOrderStatus.js` grava/aceita português também. A "correção" das PRs foi pior: `select.jsx` (componente **genérico, compartilhado por todo o app**) ganhou um remapeamento silencioso `preparando→paid` etc — o rótulo mostra uma coisa, o valor real que o Radix considera selecionado é outra. Reabrir o dropdown sem trocar nada pode gravar `status` errado sozinho | `select.jsx` (PR #86/#87, revert total recomendado) + dropdown de status em `CatalogOrdersAdmin.jsx` |
| C | Jornada (Embalando→Entregue) volta a dar "Erro ao atualizar etapa da entrega" | **Não confirmado — preciso do código da Edge Function `preview-api`, que não consegui ler.** Hipótese mais provável: ela reimplementa a lógica de `updateOrderStatus.js` em vez de usar a rota real, e ficou desatualizada em relação aos PONTOs 116-119 de hoje (não reconhece o campo `fulfillment`, ou usa a `ALLOWED` antiga, ou o `actorId` fictício `preview-admin` não existe na tabela `app_users` do staging) | Edge Function `preview-api` (fora deste repositório) |

### Os dois itens à parte pedidos (D, E)

- **Imagem do produto:** `order.product_image` já existe e já é usado na
  lista — só não é repassado pro card de conferência (`getItemsForChecklist`
  descarta tudo além de título/qtd). Cobre pedido de 1 item (a maioria, e
  todos os 6 prints do dono). Pedido com múltiplos itens não tem imagem por
  item em lugar nenhum do banco hoje (`items_json`/`raw_base44.items` só
  guardam `product_id`/`title`/`qty`) — resolver isso é trabalho novo
  (lookup por `product_id` ou gravar imagem na criação do pedido), fora do
  escopo "usar dado que já existe".
- **Etiqueta Melhor Envio:** `raw_base44.melhor_envio.{order_id,protocol,
  label_url}` já é suficiente — sem inventar estado nem chamar a API de
  novo, é só exibir condicionalmente + link de impressão.

### Recomendação, na ordem

1. Reverter `select.jsx` por completo — prioridade máxima, é o achado B.
2. Resolver o vocabulário duplo do status na fonte (itens PT no dropdown, ou
   tradução só na borda da leitura/escrita — nunca dentro de um primitive).
3. Ler o código de `preview-api` antes de decidir a correção do achado C —
   a arquitetura correta é essa função **proxiar** pro `updateOrderStatus.js`
   real contra o banco de staging, não reimplementar a regra por fora (isso
   garante divergência a cada mudança futura).
4. Trocar `toast.error('Erro ao salvar')` genérico por mensagem com o erro
   real — sem isso ninguém diagnostica de fora do console.
5. Imagem no card (pedido de 1 item) + bloco de etiqueta na Jornada.

**Nada foi escrito nesta rodada.** Resposta completa e sem cortes também
publicada como comentário nas PRs #86 e #87, pra a OpenAI ver direto onde
está trabalhando. Aguardando revisão dela antes de qualquer implementação.

---

### 11.1 Execução do comando da OpenAI no PR #87 (Preview isolado)

> A OpenAI leu a Edge Function `preview-api` de verdade (acesso que eu não
> tenho) e postou um comando de implementação completo no PR #87. Autorizado
> pelo dono: "execute exatamente o que foi definido. Não mexa em produção."

**Diagnóstico novo da OpenAI, não derivado por mim:** depois da v2 da
`preview-api`, toda chamada POST (`updateOrderStatus`/`updatePackedItems`)
volta HTTP 401 **antes** de entrar na função — problema de autenticação do
harness do Preview, não da lógica de negócio.

**Executado, só em `openai/catalog-status-sync-preview` (PR #87), commit
`5689c588`:**

1. `select.jsx` revertido por completo (era o achado B da auditoria).
2. Vocabulário PT↔EN do status resolvido **localmente** em
   `CatalogOrdersAdmin.jsx` (`statusParaSelect`) — nunca mais no primitive.
3. Admin fake por hostname `.vercel.app` **removido** — agora exige também
   `VITE_PREVIEW_STAGING=true`, variável que só a OpenAI pode configurar na
   Vercel (não tenho esse acesso). 3 variáveis exatas documentadas no fim de
   `src/api/supabaseClient.js`.
4. JWT hardcoded do harness removido — unificado com a chave que
   `supabaseClient.js` já resolve pro mesmo projeto (provável causa raiz do
   401: duas chaves divergentes pro mesmo projeto Supabase). **Não
   confirmado que fecha o 401 sozinho** — sem acesso à Edge Function pra
   testar.
5. Imagem real do produto no card de conferência (pedido de 1 item).
6. Erro do checklist mostra `error.message` real, não mais texto fixo.
7. Bloco de etiqueta Melhor Envio reforçado visualmente (dado já existente).

**Não feito, por falta de acesso, documentado para a OpenAI aplicar:** a
Edge Function `preview-api` em si — não tenho conexão ao Supabase
`preview-staging`.

**Prova:** `npm test` 219/219 · `npm run build` exit 0 · CI verde · Vercel
confirmou o MESMO alias estável que o dono já usa
(`leilonozap-git-openai-catalog-status-4593e6-leilaapp-s-projects.vercel.app`).
Resposta também publicada como comentário no PR #87.

**Status:** CORRIGIDO NA BRANCH DE PREVIEW (não é `main`, por instrução
explícita não deveria ser). **Bloqueador para o próximo teste do dono:** o
Preview só volta a abrir sozinho depois que a OpenAI configurar as 3
variáveis de ambiente na Vercel — até lá, pede login real (comportamento
esperado, não regressão). Sem alteração alguma em produção, banco de
produção ou `main`.
