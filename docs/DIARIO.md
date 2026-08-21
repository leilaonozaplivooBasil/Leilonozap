# DIÁRIO DE BORDO — Leilão NoZap

> **Registro integral da conversa entre o dono e Claude.** Criado em 21/08/2026
> por decisão do dono (D7): *"tudo que você conversar comigo tem que estar no
> handoff. Até a nossa comunicação. Pra não ter nenhum ruído, eu não precisava
> ficar printando nada."*
>
> **Este arquivo só cresce.** Nunca é reescrito, podado ou "limpo" — nem quando
> ficar grande, nem quando um registro envelhecer, nem quando um erro meu ficar
> feio no histórico. Entrada errada é corrigida com entrada nova, nunca apagando
> a antiga.
>
> **O estado atual NÃO mora aqui** — mora em `docs/CLAUDE_HANDOFF.md`. Aqui mora
> o *como se chegou nele*.
>
> Sem PII, senha, chave, token, CPF ou documento (REGRA 2). Pedido e leilão são
> citados por código público (`ARD5856D19`), nunca por dados de pessoa.

---

## Como ler

- **Ordem cronológica**, mais antigo primeiro.
- Cada entrada tem: **quem falou**, **o que pediu/respondeu**, **o que ficou decidido**.
- `→ D#` aponta para a decisão registrada no handoff.
- `→ P#` aponta para a pergunta aberta no handoff.
- Erro meu aparece marcado **ERRO MEU**, sem eufemismo. Vale para hipótese
  derrubada também.

---

# 21/08/2026

## 21/08 · Frente de frete aberta pelo dono

**DONO** — mandou prints da tela de pedidos. Dois arremates do mesmo cliente com
dois problemas: um pedido aparecia como **"retirada no balcão"** sendo que o
cliente pagou frete no lance, e **outro veio sem frete nenhum**. Pediu análise
diligente e correção — "ou qualquer outra coisa que esteja errada aí na parte de
arrematar, frete, gerar etiqueta e etcétera".

**CLAUDE** — abri a frente. Levantei a hipótese de corrida na cotação assíncrona
e de dimensões faltando no produto.

**ERRO MEU (hipótese derrubada).** As duas hipóteses estavam erradas. A OpenAI
provou que os **dois pedidos foram Arremate Rápido (Buy Now)**, e o histórico
mostrava `🔥 ARREMATE RÁPIDO!` com `frete_amount = 0`. Não era corrida nenhuma.

---

## 21/08 · Causa-raiz, achada pela OpenAI

**OPENAI** — `submitAtomicBuyNow.js` reservava só o `buyNowPrice`, criava o lance
com `frete_amount: 0` e **nunca tocava** em `auctions.frete_reservado_valor`.
Consequência nos dois sentidos:

- **sem líder anterior** → arremate com frete ZERO, empresa paga a transportadora
  do próprio bolso. Foi o `ARD5856D19`.
- **com líder anterior** → o novo vencedor **herda** o frete do líder que ele
  acabou de cobrir, cotado para **outro CEP**. Foi o `AR3BEF1939`: R$ 11,60 de um
  lance anterior de R$ 6,80.

**DONO** — decidiu: *"não podemos de maneira nenhuma aceitar lances ou arrematar
sem frete, isso vai gerar um problema grande"* → **D1**. E mandou criar já um
jeito de cobrar o frete do saldo do cliente no pedido que veio sem frete,
manualmente, depois de corrigido → **D2**.

**CLAUDE** — reescrevi a arquitetura: o servidor vira a única autoridade sobre o
frete (motor único `freteLeilao.js` + selo assinado `freteSelo.js`). 6 commits,
98 testes verdes.

---

## 21/08 · O dono desconfia do "consertado"

**DONO** — *"tem certeza que foi consertado??? ainda está dando que pedido é
retirada no balcão"*.

**CLAUDE** — **ERRO MEU, de comunicação.** Eu tinha escrito "HANDOFF PUBLICADO" e
ele leu como "está em produção". Não estava — estava na branch. Assumi e mudei o
jeito de reportar: **daqui pra frente escrevo, com essas palavras, "está na
branch, não está em produção"**.

---

## 21/08 · Auditoria da OpenAI: NÃO MERGEAR AINDA

**OPENAI** — auditou a arquitetura nova e devolveu **11 bloqueadores materiais**
(B1–B11) que os 98 testes não pegaram. Veredito: **NÃO MERGEAR AINDA**.

O mais grave, **B1**: no meu próprio commit, eu tinha apagado o
`if (!reserva.success)` e a declaração de `winnerName` no `submitAtomicBuyNow`.
Resultado: dinheiro reservado, `ReferenceError`, catch de fora que **não
estorna**. Dinheiro preso, arremate falhado, nenhuma devolução.

**B2** explicava por que passou batido: meus testes chamavam o **ajudante**, não
a rota. O dono transformou isso em regra: *"não aceitar teste de helper como
prova de rota financeira. Todo caminho que movimenta dinheiro precisa teste do
handler real."*

**DONO** — mandou corrigir na branch, sem merge, sem produção, sem banco. Ordem
fixada: correção → teste da rota real → build → handoff → auditoria → merge
→ **D3**.

---

## 21/08 · Correção dos 11 bloqueadores

**CLAUDE** — corrigi 11/11 na branch. Commits `50bb0233`, `894fe738`,
`3a289c47`, `767b3c44`. `npm test` 162/162, `npm run build` exit 0.

**A prova de que o teste do B1 morde:** desliguei a correção de propósito e
**11 dos 17 testes novos falharam**. Religuei. Sem esse passo eu estaria dizendo
"corrigido e testado" sem saber se o teste testava alguma coisa.

**Decisão técnica que mudou o alcance do que o dono pediu:** a rota de cobrar o
frete manual (**D2**) **agora se recusa a cobrar** enquanto a RPC transacional
não estiver aplicada no banco. Motivo: o caminho por compensação não é atômico, e
a OpenAI foi explícita que ele não deve ir para produção com dinheiro de cliente.
Eu concordo. **Consequência prática: o `ARD5856D19` ainda NÃO foi cobrado**, e não
vai ser até o dono autorizar a RPC → **P4**.

**Achados além dos 11, os dois meus:**

- **A1 — ERRO MEU.** A chamada da RPC usava `_user_id` e `_actor_id`, que não
  existem na função, e não mandava `_raw`. O PostgREST responde 404 a argumento
  inexistente, e o meu código trata 404 como *"a RPC não foi aplicada"*. Ou seja:
  a RPC seria aplicada, funcionaria, e a rota diria **para sempre** que falta
  aplicar. O frete pendente nunca seria cobrado e a causa ficaria invisível.
- **A2 — ERRO MEU.** A guarda de "cobrança travada" estava **depois** da RPC. A
  RPC debitaria por cima de um pedido possivelmente já debitado — e dentro de uma
  transação, o que torna o débito duplo *mais* confiável, não menos.

**Nota de autoria registrada:** B1, B7, B11, A1 e A2 são erros meus, introduzidos
nesta mesma branch ao corrigir F6–F12. Cinco defeitos materiais em seis commits
de correção. Nenhum chegou a produção. Registro porque a taxa importa: é o
argumento mais forte a favor de reauditar antes do merge.

---

## 21/08 · "Você avisou todos esses detalhes no handoff?"

**DONO** — perguntou se tudo que eu tinha contado no chat estava no handoff.

**CLAUDE** — fui conferir o arquivo em vez de responder de cabeça. **Faltavam
dois**: o A1 estava só no chat, e o A2 estava escondido dentro da célula do B8,
como se fosse parte do bloqueador, não achado separado. Corrigi, criei a seção
2.1 e a nota de autoria, e publiquei (`fb2d62a2`).

**Isso é o que originou a regra do dia.** A pergunta dele expôs que o chat e o
handoff estavam divergindo — e que quem estava fazendo a ponte à mão era ele,
com print.

---

## 21/08 · Regra nova: nada existe só no chat

**DONO** — *"a partir de agora, tudo que você conversar comigo tem que estar no
handoff. Você me comunica aqui, mas coloca no handoff também. Até a nossa
comunicação. Pra não ter nenhum ruído, eu não precisava ficar printando nada.
E se você tiver alguma ideia de melhorar ainda a nossa comunicação pro handoff,
ou pra ir à ChatGPT, você fala. A ideia é que nada passe batido, nenhuma
comunicação fique perdida e nenhum ruído seja gerado."* → **D7**

**CLAUDE** — criei este diário e reorganizei o handoff:

1. **MAPA** no topo do handoff — porta única, diz onde está cada coisa e traz os
   links `raw.githubusercontent` que a OpenAI abre sem print.
2. **`docs/DIARIO.md`** — este arquivo, append-only, registro integral.
3. **DECISÕES DO DONO** (seção 1.1) — numeradas. Decisão registrada não se
   re-discute. Regra 12.
4. **PERGUNTAS ABERTAS** (seção 1.2) — numeradas, com quem deve a resposta.
   Regra 13.
5. **Regras 11, 12 e 13** na tabela fixa da seção 0.

**Por que dois arquivos e não um:** o handoff só vale se der para ler o estado
atual em uma tela. Um registro que só cresce dentro dele destruiria isso em uma
semana. O MAPA resolve o risco de ruído: uma porta, vários cômodos.

**Sugestões que dependem do dono** — registradas como perguntas, não executadas:
**P6** (o dono passa a falar com a OpenAI só por link), **P7** (a OpenAI também
escreve no diário), **P8** (encerramento de ciclo em 5 linhas fixas).
