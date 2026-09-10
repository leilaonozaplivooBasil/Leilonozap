// 🔐 O FRAME DO RITUAL NÃO ENCOSTA NO STORAGE (09/09/2026).
//
// ══════════════════════════════════════════════════════════════════════════
// O QUE ESTAVA ACONTECENDO
// ══════════════════════════════════════════════════════════════════════════
// Pra julgar se o ritual é em casa (DIR-125), a tela captura UM frame do
// vídeo ao vivo — o rosto da pessoa, dentro da casa dela, às 5h da manhã — e
// mandava esse frame pro `public-assets`, que é `public = true`, só pra ter
// uma URL que a IA conseguisse buscar.
//
// Conferido no Storage em 09/09: 5 frames de rosto já lá, com link aberto,
// sem login, sem validade. E crescia um por amanhecer.
//
// ══════════════════════════════════════════════════════════════════════════
// POR QUE BASE64, E NÃO O COFRE PRIVADO
// ══════════════════════════════════════════════════════════════════════════
// O cofre (`xgame-videos`) resolveria a exposição — mas guardaria pra sempre
// uma foto que NADA usa depois. O frame não é comprovação: ele não entra na
// `comprovacao`, ninguém abre ele de novo, nenhuma tela mostra. Existe pra uma
// única pergunta ("isto é a casa dela?") e depois é lixo.
//
// Guardar num cofre também criaria um arquivo que a faxina de 30 dias NÃO
// alcança: `purgarAudiosAntigos` acha o que apagar pelo caminho gravado na
// comprovação, e o frame não tem caminho gravado em lugar nenhum. Ficaria
// órfão no cofre pra sempre — o cenário que o próprio comentário daquela rota
// diz que não se quer com gravação de gente.
//
// Então o frame vai INLINE na chamada e morre com ela. Não vira objeto, não
// vira link, não vira linha. A única cópia que existe é a que a IA olha.
//
// (O VÍDEO é diferente e continua indo pro cofre: ele É a comprovação, o
// gestor precisa poder ver, e a tela promete que fica guardado.)

/** Só o que a API de visão aceita — e o frame que a tela gera é sempre JPEG. */
const MIMES_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Teto do frame. Um quadro de câmera a 0,85 de qualidade dá 150–500 KB; 3 MB
 * é folga larga. Serve pra que um `videoWidth` absurdo não vire um corpo de
 * requisição que a Vercel corta no meio — sem frame o ritual segue, com meio
 * frame ele quebraria.
 */
export const TETO_FRAME_BYTES = 3 * 1024 * 1024;

export function ehImagemAceita(mime) {
  return MIMES_ACEITOS.includes(String(mime || '').toLowerCase());
}

/**
 * Blob de imagem → data URL `data:image/jpeg;base64,...`, ou `null`.
 *
 * NUNCA LANÇA, no mesmo espírito do cofre de voz: o julgamento de ambiente é
 * um extra do ritual. Se o frame não der, a pessoa não pode ficar sem ritual.
 */
export async function frameEmBase64(blob) {
  try {
    if (!blob || typeof blob.arrayBuffer !== 'function') return null;
    if (!ehImagemAceita(blob.type)) return null;
    if (Number(blob.size) > TETO_FRAME_BYTES) return null;

    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (!bytes.length) return null;

    // ⚠️ EM PEDAÇOS DE PROPÓSITO. `String.fromCharCode(...bytes)` com um frame
    // de megabytes espalha centenas de milhares de argumentos na pilha e
    // estoura com "Maximum call stack size exceeded" — num aparelho melhor,
    // com câmera maior, justamente. 32 KB por vez não estoura em lugar nenhum.
    let binario = '';
    const PEDACO = 0x8000;
    for (let i = 0; i < bytes.length; i += PEDACO) {
      binario += String.fromCharCode(...bytes.subarray(i, i + PEDACO));
    }
    const b64 = typeof btoa === 'function'
      ? btoa(binario)
      : Buffer.from(binario, 'binary').toString('base64');
    return `data:${String(blob.type).toLowerCase()};base64,${b64}`;
  } catch {
    return null;
  }
}
