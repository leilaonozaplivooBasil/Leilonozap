/**
 * capaDoVideo — o primeiro quadro do vídeo é a CAPA no WhatsApp.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * 🔴 POR QUE ISTO EXISTE (17/09/2026)
 * ══════════════════════════════════════════════════════════════════════════
 * Dono: "preciso que o vídeo chegue no WhatsApp em um frame melhor e não no
 * primeiro frame dos vídeos, que costuma ser tudo preto".
 *
 * E não dá para mandar outra capa. O WhatsApp GERA a miniatura sozinho, no
 * aparelho de quem recebe, decodificando o PRIMEIRO QUADRO do arquivo. Não
 * existe meta tag, mime, parâmetro do Web Share API nem campo nenhum que
 * aponte outro quadro. Quem escolhe a capa é o arquivo.
 *
 * Então o conserto não é no compartilhar: é não deixar subir um vídeo que
 * começa preto. Esta régua olha os primeiros segundos ANTES do envio e diz,
 * com número, até onde está escuro — para quem cadastra cortar e subir de novo.
 *
 * ── o que foi descartado, e por quê ──
 * Reencodar no navegador na hora de compartilhar: 7,9 MB levam mais tempo do
 * que a pessoa espera, e `captureStream` NÃO EXISTE no Safari do iPhone —
 * falharia justamente onde mais se compartilha.
 *
 * ── esta metade é pura de propósito ──
 * Decodificar vídeo precisa de `<video>` e `<canvas>`, que só existem no
 * navegador. As DECISÕES (o que é escuro, onde amostrar, o que dizer) moram
 * aqui, sem DOM, e é isso que dá para provar sem abrir um Chromium.
 */

/**
 * Brilho percebido de um quadro, de 0 (preto) a 255 (branco).
 *
 * Luma da recomendação BT.709 — o verde pesa mais porque o olho enxerga mais
 * verde. Média simples de R, G e B daria "cinza" para um azul escuro saturado.
 *
 * @param {Uint8ClampedArray|number[]} pixels RGBA em sequência, como o canvas devolve
 */
export function brilhoDoQuadro(pixels) {
  if (!pixels || pixels.length < 4) return 0;
  let soma = 0;
  let n = 0;
  for (let i = 0; i + 2 < pixels.length; i += 4) {
    soma += 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
    n += 1;
  }
  return n ? soma / n : 0;
}

/**
 * Abaixo disto o quadro não serve de capa.
 *
 * 18 de 255 (~7%) é quase preto: cabe a tela de abertura preta e o fade-in que
 * os editores colocam, e NÃO cabe uma cena noturna ou um produto preto sobre
 * fundo escuro — essas passam de 18 fácil. O teto é de propósito baixo: avisar
 * demais faz quem cadastra ignorar o aviso, que é pior que não ter aviso.
 */
export const TETO_DE_ESCURO = 18;

/** O quadro é escuro demais para ser capa? */
export function quadroEscuro(brilho, teto = TETO_DE_ESCURO) {
  return Number(brilho) < teto;
}

/**
 * Em que segundos olhar. Denso no começo, porque é lá que mora o problema:
 * uma abertura preta some nos dois primeiros segundos.
 *
 * Nunca passa da duração do vídeo — pedir `currentTime` além do fim deixa o
 * `seeked` sem disparar e a análise pendurada para sempre.
 */
export function momentosParaOlhar(duracao) {
  const fim = Number(duracao);
  if (!Number.isFinite(fim) || fim <= 0) return [0];
  const alvos = [0, 0.2, 0.5, 1, 1.5, 2, 3, 4];
  const dentro = alvos.filter((t) => t < fim);
  return dentro.length ? dentro : [0];
}

/**
 * Até que segundo o vídeo está escuro.
 *
 * @param {{t:number, brilho:number}[]} amostras em ordem de tempo
 * @returns {{escuroAte:number|null, tudoEscuro:boolean}}
 *   `escuroAte` é o instante da PRIMEIRA amostra clara — o ponto para onde
 *   cortar. `null` quando o começo já está bom. `tudoEscuro` quando nenhuma
 *   amostra prestou, e aí não há para onde cortar: o vídeo é escuro mesmo.
 */
export function ateQuandoEscuro(amostras, teto = TETO_DE_ESCURO) {
  const lista = Array.isArray(amostras) ? amostras.filter((a) => a && Number.isFinite(Number(a.t))) : [];
  if (lista.length === 0) return { escuroAte: null, tudoEscuro: false };
  if (!quadroEscuro(lista[0].brilho, teto)) return { escuroAte: null, tudoEscuro: false };
  const claro = lista.find((a) => !quadroEscuro(a.brilho, teto));
  if (!claro) return { escuroAte: null, tudoEscuro: true };
  return { escuroAte: Number(claro.t), tudoEscuro: false };
}

const seg = (n) => Number(n).toFixed(1).replace('.', ',');

/**
 * O recado para quem está cadastrando. Vazio quando não há o que avisar —
 * a tela não desenha faixa de aviso à toa.
 */
export function recadoDaCapa({ escuroAte, tudoEscuro }) {
  if (tudoEscuro) {
    return 'O vídeo é escuro do começo ao fim. O WhatsApp usa o primeiro quadro como capa, '
      + 'então a miniatura vai sair quase preta. Se der, clareie o começo antes de subir.';
  }
  if (escuroAte === null || escuroAte === undefined) return '';
  return `Os primeiros ${seg(escuroAte)}s do vídeo estão pretos. O WhatsApp usa o PRIMEIRO QUADRO `
    + `como capa, então a miniatura vai sair preta. Corte até ${seg(escuroAte)}s e suba de novo — `
    + 'ou mande assim mesmo, se preferir.';
}
