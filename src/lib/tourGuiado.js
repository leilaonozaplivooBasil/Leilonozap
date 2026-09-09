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
