## 🪙 DIR-184 — As moedas vazavam pra dentro das visões (24/09/2026)

**Dono, olhando o DIR-183:** "ficou quase perfeito. As moedas só têm que
aparecer quando eu abrir o quadro. Cliquei na Jornada, vai sumir tudo, vai
aparecer só a Jornada."

**🔴 O que eu errei no DIR-183:** prendi o `PlacarDoDia` à capa e **esqueci que
a moeda em fatias, o Modelo, o "Onde estou × Executivo Ideal", as Missões e a
votação do MvM são blocos SEPARADOS**, todos presos a `mostrarPainel` — e o
`mostrarPainel` ainda tinha dois escapes:

```
const mostrarPainel = naCapaDasVisoes || (visao === 'lista' && !celular) || painelAberto;
                                          └─ dentro da Lista, no computador   └─ GRAVADO no aparelho
```

O segundo é o grave: `painelAberto` vem do `localStorage`, então **quem já
tinha o painel aberto via a moeda dentro de TODA visão** — exatamente o que o
dono viu. Prender metade do placar à capa e deixar a outra metade solta não é
meio conserto: é o defeito inteiro, porque quem vazava era justo a moeda.

Agora é uma frase só, sem escape: `const mostrarPainel = naCapaDasVisoes;`

**🗑️ E o "Eu no Game" morreu junto**, de propósito. Ele recolhia/fixava o
placar (pedido de 08/09). Com a capa sendo o lugar onde tudo aparece e a visão
o lugar onde nada de placar aparece, ele não tem mais dois estados pra
alternar — botão morto, e estado morto gravado no aparelho é o que volta a
assombrar seis meses depois. A escolha do dono virou a estrutura da tela.

**Provas:**
- `tests/capaDasVisoes.test.mjs` (11) — dois testes novos travam a regra pelos
  DOIS lados: a frase do `mostrarPainel` não pode ganhar escape, e todo bloco
  do placar tem que estar preso a ela (varre `moeda-pizza`, `moeda-pizza-modelo`
  e `votacao-mvm-toggle` no arquivo e exige a guarda antes de cada um).
- Mutação: repus o escape do `painelAberto` → caiu o 1º; soltei a moeda em
  fatias da capa → caiu o 2º. Restaurei, verde.
- `tests/navegador/placarDoDia.spec.mjs` (5) no Chromium real.
- Suíte **3691/3691** · lint 0 erro · build OK.

---

