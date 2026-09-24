## 🧭 DIR-182 — A fileira das visões gruda no topo (24/09/2026)

**Dono:** "eu quero que a barra da Jornada, Lista, Quadro e tal agora fique
FIXA no local mais estratégico pra guiar a organização."

Ela cola **logo abaixo da barra do app** — `calc(3.5rem + var(--nz-entalhe))`,
a mesma conta do `.nz-abaixo-da-barra` (é pra isso que a medida do entalhe
virou variável única no DIR-181). O rodapé de baixo já é do botão AGORA da
Jornada; o topo é onde a pessoa olha pra se orientar.

**Dois defeitos que a banca achou no caminho, os dois de verdade:**

1. 🔴 **`overflow-x: hidden` no `body` estava matando `position: sticky` na
   APLICAÇÃO INTEIRA.** `hidden` transforma o body num contêiner de rolagem, e
   o elemento grudado passa a se medir por ele — que não rola. Medido: a
   fileira terminava em −425px depois de 900px de rolagem. Trocado por
   `overflow-x: clip`, que corta idêntico e NÃO cria contêiner; o `hidden`
   fica antes como reserva pra navegador velho. Nenhuma barra grudada
   funcionaria em lugar nenhum do app antes disso.

2. 🔴 **O palco escuro repinta todo `[class*="bg-white"]` pra vidro de 4,5%
   com `!important`.** Uma barra grudada translúcida vira sopa de texto, com o
   conteúdo passando por baixo. A faixa ganhou fundo próprio (`.nz-faixa-fundo`),
   opaco, um por tema, com nome que aquela regra não alcança.

**Provas:** `tests/navegador/guia.spec.mjs` (12/12) — rola 900px e mede que a
fileira trava encostada na barra (475px → 60px, com a barra acabando em 56) e
continua clicável depois de grudada; e mede o alfa do fundo (≥ 0,9).
A banca foi corrigida pra ESPELHAR o app: sem caixa própria em volta da faixa
(sticky só gruda enquanto o pai está na tela) e respeitando a barra do topo.
Suíte 3680/3680 · lint 0 erro · build OK.

---

