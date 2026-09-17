/**
 * somDoDestaque — o som do vídeo no card do destaque, e quem cala a rádio.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * 🔴 O PEDIDO E A REGRA QUE ELE ESBARRA (17/09/2026)
 * ══════════════════════════════════════════════════════════════════════════
 * Dono: "deixa o som do vídeo sempre on com a opção de pause o som".
 *
 * Não existe "sempre on" na partida. Chrome, Safari, Firefox e Edge recusam
 * `play()` com som antes de qualquer toque da pessoa — desde 2018, e a
 * promessa não é devolvida: o vídeo fica parado no primeiro quadro. Um vídeo
 * que nasce com som não é um vídeo com som, é um vídeo que não toca.
 *
 * O que a regra permite, e é o que está aqui: nascer MUDO (aí toca sozinho) e
 * tirar o mudo no PRIMEIRO toque ou clique da pessoa em qualquer lugar da
 * página. Do ponto de vista de quem usa, o som entra logo — e entra sem
 * bloqueio nenhum, porque aí já houve gesto.
 *
 * A escolha da pessoa manda: se ela apertar 🔇, fica mudo, e continua mudo na
 * próxima visita. O padrão, para quem nunca mexeu, é COM som.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUE A RÁDIO PRECISA CALAR
 * ══════════════════════════════════════════════════════════════════════════
 * O X-MUSIC toca no canto da tela. Sem isto, o som do vídeo entraria POR CIMA
 * da rádio e a pessoa ouviria os dois — pior que não ter som nenhum. O card
 * não conhece o player (e não deve): avisa por evento, e quem toca decide.
 */

export const CHAVE_DO_SOM = 'nz_som_destaque';

/** Evento que pede à rádio para calar. O X-MUSIC escuta; ninguém mais precisa saber. */
export const PEDIDO_DE_SILENCIO = 'nz:silenciar-musica';

/**
 * A pessoa quer som no vídeo do destaque?
 * Padrão `true` — só fica `false` se ela apertou 🔇 alguma vez.
 * Nunca lança: em aba anônima ou com armazenamento bloqueado, `localStorage`
 * pode explodir só de ser lido.
 */
export function querSom() {
  try {
    return localStorage.getItem(CHAVE_DO_SOM) !== 'mudo';
  } catch {
    return true;
  }
}

/** Guarda a escolha. Falha calada: a preferência é conforto, não regra de negócio. */
export function gravarQuerSom(quer) {
  try {
    localStorage.setItem(CHAVE_DO_SOM, quer ? 'ligado' : 'mudo');
  } catch { /* sem armazenamento: vale só para esta visita */ }
}

/** Pede à rádio que pare, para os dois sons não se atropelarem. */
export function calarARadio() {
  try {
    window.dispatchEvent(new CustomEvent(PEDIDO_DE_SILENCIO));
  } catch { /* sem window (SSR/teste): nada a calar */ }
}
