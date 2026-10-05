## 👔 DIR-185 — O elenco sumia no celular (05/10/2026)

**Dono, com um print do iPhone e outro do MacBook lado a lado:** "na Jornada os
bonequinhos que aparecem no desktop não estão aparecendo no mobile. Precisa
identificar esse erro imediatamente e fazer toda a experiência ser igual em
todos os dispositivos."

**🔴 A causa, numa linha só** (`XGameJornada.jsx`, o `<span>` do boneco):

```
hidden sm:block
```

Escondido abaixo de 640px — ou seja, em **todo celular**, de propósito. Era
precaução contra o boneco vazar pela lateral numa tela estreita, e **ninguém
nunca mediu se vazava mesmo**.

**Medido agora, em Chromium real, em três larguras:**

| largura | bonecos | vaza esquerda | vaza direita | rolagem lateral |
|---|---|---|---|---|
| 320px (iPhone SE) | 3 | 0 | 0 | não |
| 390px (iPhone atual) | 3 | 0 | 0 | não |
| 1280px (computador) | 3 | 0 | 0 | não |

A 390px as caixas ficam entre 174px e 295px numa tela de 390 — sobra larga dos
dois lados. A precaução escondia um elenco que sempre coube.

**Provas:** `tests/navegador/rodapeJornada.spec.mjs` (+2) — um mede os dois
lados e a rolagem nas três larguras; o outro compara o elenco do celular com o
do computador e exige que sejam **idênticos** (mesmo boneco, mesma pose).

**🩹 A mutação achou um defeito no MEU teste:** repus o `hidden sm:block` e o
segundo teste PASSOU — porque `hidden` deixa o elemento no DOM, e eu estava
contando presença, não visibilidade. Corrigido pra filtrar por caixa com
largura > 0. Com a correção, a mutação derruba os dois. Um teste que não cai
com o defeito de volta não é prova de nada.

**Varredura:** zero `hidden sm:` / `sm:hidden` / `useEhCelular` sobrando em
`XGameJornada`, `XGameCapas`, `ElencoBoneco`, `PlacarDoDia`, `BarraDaVisao`,
`PortasDasVisoes` e `RodapeDaJornada`. A experiência é a mesma em todo aparelho.

Suíte **3691/3691** · lint 0 erro · build OK.

---

