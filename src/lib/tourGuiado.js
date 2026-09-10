// 🖐️ o cálculo puro de posição do balão da "mãozinha" (TourGuiado.jsx) —
// separado num .js porque precisa ser testável sem montar componente/JSX
// (mesmo padrão de metodo.js/xgame.js: lógica pura aqui, JSX só desenha).
//
// 🩹 09/09/2026 — dono, ao vivo, testando o tour: "abriu tanto que não dava
// pra ver o botão de continuar." Os textos dos passos cresceram (pergunta
// socrática antes da explicação) e o balão não tinha limite de altura: perto
// do rodapé da tela, ele nascia estourando pra baixo do viewport — o botão
// "próximo" existia, só não tinha como ver nem clicar, sem nada que rolasse
// até ele. Agora o `top` SEMPRE é clampado pra o balão inteiro (do tamanho
// real `alturaMax`, o mesmo número que vira o `maxHeight` do JSX) caber
// dentro da tela — não só decidir cima-ou-baixo como antes.
export function estiloBalao(retangulo, alturaMax = 420) {
  if (typeof window === 'undefined' || !retangulo) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.min(Math.max(retangulo.left, 12), Math.max(12, vw - 340));
  const topMax = Math.max(12, vh - alturaMax - 12); // o maior `top` onde o balão ainda cabe inteiro
  const abaixoDoAlvo = retangulo.top + retangulo.height + 16;
  const acimaDoAlvo = retangulo.top - 16 - alturaMax;
  // prefere embaixo do alvo; só sobe se embaixo não couber E em cima tiver mais espaço
  const top = abaixoDoAlvo <= topMax ? abaixoDoAlvo : Math.max(12, Math.min(acimaDoAlvo, topMax));
  return { top, left };
}

/**
 * 🔴 10/09/2026 — O BALÃO GRUDAVA NO TOPO DA TELA, LONGE DO ALVO.
 *
 * `estiloBalao` posicionava usando `alturaMax` — 420px FIXOS — e não a altura
 * real do balão. Numa janela útil de ~640px (a do vídeo do dono), isso dá
 * `topMax = 640 − 420 − 12 = 208`: qualquer alvo abaixo de y≈192 caía no ramo
 * "não cabe embaixo", subia, e era grampeado em 12 — o canto superior
 * esquerdo. Em notebook isso acontecia quase sempre, e o balão aparecia
 * descolado do que ele estava explicando.
 *
 * Um passo de três linhas ocupa ~150px. Medindo a altura de verdade, ele cabe
 * embaixo do alvo na esmagadora maioria dos casos — que é onde a pessoa está
 * olhando.
 *
 * Esta função é a mesma conta, só que recebendo a altura MEDIDA. O `alturaMax`
 * continua existindo pra limitar o `maxHeight` no JSX; o que muda é que a
 * POSIÇÃO passa a usar o número real.
 */
export function posicaoDoBalao(retangulo, alturaReal, alturaMax = 420) {
  const altura = Math.max(80, Math.min(Number(alturaReal) || alturaMax, alturaMax));
  return estiloBalao(retangulo, altura);
}

/**
 * Os quatro retângulos que escurecem a tela em volta do alvo, deixando o
 * BURACO do alvo livre.
 *
 * 🔴 Por que quatro, e não um `box-shadow` gigante: o overlay antigo era um
 * `fixed inset-0` que cobria a tela inteira e engolia TODO clique — o tour
 * destacava um botão e a pessoa não conseguia apertar esse botão. Era a queixa
 * "pouco interativo": só dava pra ler e clicar em "próximo".
 *
 * Com quatro painéis, o miolo fica vazio: o clique chega no elemento real.
 */
export function paineisDoEscuro(retangulo, vw, vh, folga = 8) {
  if (!retangulo) return [{ top: 0, left: 0, width: vw, height: vh }];
  const cima = Math.max(0, retangulo.top - folga);
  const baixo = Math.min(vh, retangulo.top + retangulo.height + folga);
  const esq = Math.max(0, retangulo.left - folga);
  const dir = Math.min(vw, retangulo.left + retangulo.width + folga);
  return [
    { top: 0, left: 0, width: vw, height: cima },
    { top: baixo, left: 0, width: vw, height: Math.max(0, vh - baixo) },
    { top: cima, left: 0, width: esq, height: Math.max(0, baixo - cima) },
    { top: cima, left: dir, width: Math.max(0, vw - dir), height: Math.max(0, baixo - cima) },
  ].filter((p) => p.width > 0 && p.height > 0);
}
