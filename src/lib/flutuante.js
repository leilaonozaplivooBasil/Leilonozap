// 🧭 PRA QUE LADO UM PAINEL FLUTUANTE ABRE.
//
// POR QUE ISTO É UM ARQUIVO SEPARADO: a regra estava dentro do componente do
// X-Music, misturada com JSX, e por isso não tinha como um teste dizer se ela
// estava certa. É decisão pura — entram as coordenadas, sai o lado —, então
// mora aqui, coberta por teste.
//
// O QUE ESTAVA CERTO, E EU QUASE "CONSERTEI" À TOA (06/09/2026): a conta
// vertical antiga era `y < altura/2`. Fui medir antes de trocar: ela e a conta
// por espaço só discordam numa faixa de QUATRO pixels (y 450..453 numa janela
// de 900). Ou seja, o painel já descia quando a pílula estava em cima. Não era
// ali o problema que o dono viu — era o clique, que a captura de ponteiro
// matava (ver src/hooks/useArrastavel.js). Ficou a conta por espaço porque ela
// diz o que quer dizer e não depende da janela ser simétrica, mas sem fingir
// que consertou algo.
//
// O QUE ESTAVA MESMO FALTANDO: a HORIZONTAL. O painel era sempre ancorado à
// esquerda da pílula (`left-0`). Arrastada pra beirada direita, ele vazava pra
// fora da tela e metade da lista ficava inalcançável. Agora ele vira pro lado
// de dentro sozinho.

/** Altura mínima que faz o painel valer a pena — abaixo disso, vira fresta. */
export const ALTURA_MINIMA_PAINEL = 220;
/** A barra fixa do site mora no topo; o dock e o selo de preview, no pé. */
export const FOLGA_TOPO = 80;
export const FOLGA_PE = 72;

/**
 * @param {object} p
 * @param {number|null} p.x        canto esquerdo da pílula (null = posição padrão)
 * @param {number|null} p.y        topo da pílula
 * @param {number} p.larguraJanela
 * @param {number} p.alturaJanela
 * @param {number} [p.larguraPainel]
 * @returns {{praBaixo:boolean, pelaDireita:boolean, teto:number}}
 */
export function ladoDaAbertura({ x, y, larguraJanela, alturaJanela, larguraPainel = 320 }) {
  // Sem posição salva, a pílula está no canto de baixo à esquerda: dali o
  // painel sempre sobe, e sobe pelo lado esquerdo.
  const solta = x != null && y != null;
  const yy = solta ? y : alturaJanela - 96;
  const xx = solta ? x : 16;

  // Abre pro lado que tem mais espaço. O que não couber rola por dentro.
  const espacoAcima = yy - FOLGA_TOPO;
  const espacoAbaixo = alturaJanela - yy - FOLGA_PE;
  const praBaixo = solta ? espacoAbaixo > espacoAcima : false;

  // O painel encolhe junto com a tela (88vw no celular): usar 320 fixo faria
  // ele ancorar à direita sem precisar num aparelho estreito.
  const largura = Math.min(larguraPainel, larguraJanela * 0.88);
  const pelaDireita = solta ? xx + largura > larguraJanela - 8 : false;

  const livre = praBaixo ? espacoAbaixo : espacoAcima;
  return { praBaixo, pelaDireita, teto: Math.max(ALTURA_MINIMA_PAINEL, Math.round(livre)) };
}
