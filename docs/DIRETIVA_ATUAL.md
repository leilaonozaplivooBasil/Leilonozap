## 🎴 DIR-183 — A capa das visões do Compromisso (24/09/2026)

**Dono:** "eu preciso da mesma função igual os 08 Hábitos do Sucesso: quando eu
clicar em Jornada vai sumir os outros, sumir a moeda, sumir TUDO e aparecer só
o card — exatamente como está funcionando os Hábitos. E eu posso passar
lateralmente com a seta ou clicando nos quadrados, e ter a página principal
onde aparecem as moedas e etc."

É o padrão do DIR-179 um nível abaixo. **A causa era a mesma:** `visao` caía em
`'jornada'` quando nada casava, então a tela NUNCA teve o estado "nenhuma visão
aberta" — os 5 botões e o conteúdo de uma visão conviviam sempre. Agora são
dois estados, e nunca os dois juntos:

| | |
|---|---|
| **CAPA** (`visao === null`) | os 5 quadrados (`PortasDasVisoes`) + o placar inteiro: Human Token, moeda em fatias, fogo, X-Pay |
| **VISÃO ABERTA** | a barra fina grudada (`BarraDaVisao`: ‹ Nome › + "02 / 05" + ⭐) e só o conteúdo dela |

**Duas decisões do dono, com o custo na mesa:**
- **só o DIA ZERADO fura o foco.** Dentro de uma visão some tudo — menos os
  avisos de hora marcada que custam o dia inteiro (`furaOFoco()`). O aviso do
  Ritual do Amanhecer já aparecia acima da faixa e continua aparecendo.
- **o placar fica só na capa.** É o que dá motivo pra capa existir.

**O preço, dito na hora:** um toque a mais pra chegar na Jornada na primeira
vez do dia. Mitigado por lembrar a última visão + a URL `?visao=` + o atalho ⭐,
que continuam caindo direto onde a pessoa parou.

**Provas:**
- `tests/capaDasVisoes.test.mjs` (9) — ordem, volta do ‹ ›, precedência
  URL > aparelho > capa, memória que APAGA ao voltar pra capa, aparelho sem
  storage, e quem fura o foco.
- `tests/navegador/guia.spec.mjs` (13) e `atalhoTopCollege.spec.mjs` (2) —
  Chromium real: dentro de uma visão os outros 4 quadrados somem; o ‹ › dá a
  volta (05/05 → 01/05); voltar mostra a capa com os cinco e o contador das
  Demandas; a barra gruda encostada na barra do app com fundo sólido.
- Mutação: pus a memória na frente da URL → caíram 2 testes (o do atalho
  junto); fiz o aviso âmbar furar o foco → caiu o teste do foco. Restaurei.
- Suíte 3689/3689 · lint 0 erro · build OK.
- `FaixaVisao.jsx` foi apagada: ela era o estado único que esta diretiva
  desmancha.

---

