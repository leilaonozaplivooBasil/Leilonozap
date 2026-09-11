// 🎥 O TETO DO GRAVADOR — 11/09/2026
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ISTO EXISTE
// ═══════════════════════════════════════════════════════════════════════════
// Primeira manhã do ritual em três blocos. Cinco pessoas entregaram os três
// blocos. DOIS vídeos não chegaram ao cofre:
//
//   Beatriz ... 121s de gravação ... Storage recusou: "exceeded the maximum
//                                    allowed size"
//   Iara ...... 124s ............... "Load failed" + "exceeded the maximum"
//
// E os três que chegaram:
//
//   Emannuel .. 128s ... 20 MB   ← gravou MAIS TEMPO que as duas
//   Elenice ... 127s ... 32 MB
//   paim ...... 123s ... 48 MB
//
// 🔴 Repare: quem gravou MAIS TEMPO subiu o arquivo MENOR. Duração não é a
// variável — todo mundo ficou entre 121s e 128s. O que muda é o ENCODER DO
// APARELHO, e é por isso que não adianta pedir pra pessoa "gravar mais curto":
// ela já gravou curto. Ela não tem controle nenhum sobre o que está errado.
//
// ═══════════════════════════════════════════════════════════════════════════
// A CAUSA
// ═══════════════════════════════════════════════════════════════════════════
// O gravador pedia `{ video: { facingMode, width: 480 } }` e construía o
// MediaRecorder SEM `videoBitsPerSecond`. Duas falhas em cima da outra:
//
//   1. `width: 480` solto é um VALOR IDEAL, não um limite. A spec trata número
//      cru como `{ ideal: 480 }`. Celular topo de linha entrega 1080p e está
//      obedecendo a regra.
//   2. Sem bitrate declarado, QUEM ESCOLHE É O APARELHO. iPhone recente sai
//      perto de 20 Mbps. 2 minutos a 20 Mbps = ~300 MB. O balde tem 100 MB.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE O TETO É O BITRATE, E NÃO A RESOLUÇÃO
// ═══════════════════════════════════════════════════════════════════════════
// A tentação é trocar `width: 480` por `width: { max: 640 }`. 🔴 NÃO.
//
// `max` é restrição DURA: se a câmera não tiver um modo que caiba, o
// getUserMedia estoura OverconstrainedError. E o catch de quem chama isto
// desliga o vídeo inteiro ("não consegui abrir a câmera"). Trocaríamos
// "o vídeo ficou grande" por "não tem vídeo nenhum" — que é pior, porque o
// vídeo é o que dá o selo BRILHANTE.
//
// Por isso TODA restrição de câmera aqui é `ideal`: pedido, nunca exigência.
// Quem não puder atender, entrega o que tem e ninguém fica sem câmera.
//
// O teto de verdade é `videoBitsPerSecond`, e ele é de outra natureza: não é
// negociado com o hardware da câmera, é o encoder do navegador obedecendo um
// número. Mesmo que o aparelho insista em 1080p, a 1 Mbps o arquivo cabe.
//
//   1 Mbps × 120s = 15 MB   (contra os ~300 MB de hoje)
//
// E 1 Mbps é de sobra pro que este vídeo é: um rosto falando, parado, em
// ambiente fechado. Não é cinema.

/** O teto de verdade: o encoder obedece isto sem negociar com a câmera. */
export const VIDEO_BITS_POR_SEGUNDO = 1_000_000;

/** Pedidos à câmera — todos `ideal`, nunca `max` (ver o cabeçalho). */
export const VIDEO_LARGURA_IDEAL = 640;
export const VIDEO_ALTURA_IDEAL = 480;
export const VIDEO_FPS_IDEAL = 24;

/**
 * O que o balde `xgame-videos` aceita — espelho de
 * `supabase/migrations/20260911190000_xgame_videos_teto_200mb.sql`.
 *
 * 🔴 Subiu de 100 pra 200 MB por um motivo que o teto acima NÃO cobre: a
 * visualização tem rede de segurança de 15 MINUTOS (VISUALIZACAO_TETO_SEG), e
 * 15 min a 1 Mbps dá 112,5 MB. Com balde de 100 MB, a PRÓPRIA rede de
 * segurança do ritual produziria um arquivo recusado — um teste deste módulo
 * é que achou isso. O caso real (2 min = 15 MB) agora cabe treze vezes.
 */
export const COFRE_TETO_BYTES = 200 * 1024 * 1024;

/**
 * O teto que ESTE arquivo usa pra avisar — 10% abaixo do balde.
 *
 * A margem não é superstição: o que o Storage mede é o corpo da requisição,
 * que carrega cabeçalho e envelope além dos bytes do vídeo. Um arquivo de
 * 99,9 MB pode ser recusado por um balde de 100 MB.
 */
export const AVISO_TETO_BYTES = Math.floor(COFRE_TETO_BYTES * 0.9);

/**
 * O que pedir à câmera. `lado` é 'user' (frontal) ou 'environment' (traseira).
 *
 * 🔴 `facingMode` continua `ideal` por causa da DIR-93 (virar a câmera): num
 * notebook sem câmera traseira, `{ exact: 'environment' }` estouraria e a
 * pessoa ficaria sem vídeo por ter apertado um botão de conforto.
 */
export function restricoesDaCamera(lado) {
  return {
    video: {
      facingMode: { ideal: lado },
      width: { ideal: VIDEO_LARGURA_IDEAL },
      height: { ideal: VIDEO_ALTURA_IDEAL },
      frameRate: { ideal: VIDEO_FPS_IDEAL },
    },
    audio: false,
  };
}

/**
 * As opções do MediaRecorder — com o teto SEMPRE presente.
 *
 * 🔴 O bitrate não depende do mimeType. Antes, quando `video/webm` não era
 * suportado (Safari), o código passava `undefined` como opções e ia embora
 * sem teto nenhum — justamente no navegador dos aparelhos que estouraram.
 * Aqui o objeto existe sempre; o mimeType é que é opcional.
 *
 * `suporta` é injetado (normalmente `MediaRecorder.isTypeSupported`) pra esta
 * função poder ser testada fora do navegador.
 */
export function opcoesDoGravador(suporta) {
  const opcoes = { videoBitsPerSecond: VIDEO_BITS_POR_SEGUNDO };
  try {
    if (typeof suporta === 'function' && suporta('video/webm')) opcoes.mimeType = 'video/webm';
  } catch { /* navegador sem isTypeSupported: segue sem mimeType, com teto */ }
  return opcoes;
}

/** Quantos bytes esperar de uma gravação de `segundos`, no teto declarado. */
export function tamanhoPrevisto(segundos) {
  const s = Number(segundos);
  if (!Number.isFinite(s) || s <= 0) return 0;
  return Math.round((VIDEO_BITS_POR_SEGUNDO / 8) * s);
}

/** O arquivo cabe no cofre? Blob vazio/ausente conta como "cabe" (não há o que subir). */
export function videoCabeNoCofre(bytes) {
  const b = Number(bytes);
  if (!Number.isFinite(b) || b <= 0) return true;
  return b <= AVISO_TETO_BYTES;
}

const emMB = (bytes) => Math.round(Number(bytes) / (1024 * 1024));

/**
 * O aviso honesto quando, mesmo com o teto, o arquivo saiu grande demais.
 *
 * 🔴 Isto é o que faltava hoje de manhã. A Beatriz tentou OITO vezes sem nunca
 * saber o que estava errado — a tela não dizia que o problema era tamanho, e
 * ela não tinha como adivinhar. Uma pessoa que não sabe o que está errado
 * repete o que já fez, que é exatamente o que ela fez.
 *
 * `null` quando cabe: quem chama usa isso como "não há nada a dizer".
 */
export function avisoDoVideoGrande(bytes) {
  if (videoCabeNoCofre(bytes)) return null;
  return `A gravação saiu com ${emMB(bytes)} MB e o limite é ${emMB(AVISO_TETO_BYTES)} MB — não é culpa sua, é a câmera do aparelho gravando em qualidade alta demais. Regrave um pouco mais curta, ou conclua sem o vídeo (você perde só o selo BRILHANTE).`;
}
