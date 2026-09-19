// 📷 ENCOLHER A FOTO ANTES DE SUBIR.
//
// 17/09/2026 — "erro de validação, o que pode estar fora do ar?". A IA estava
// no ar e com saldo. O que acontecia: a foto tinha 5,85 MB, a Anthropic recusa
// imagem acima de 5 MB com 400, e a tela traduzia esse 400 como "IA
// indisponível". A porta do app deixava passar até 8 MB — ou seja, existia uma
// faixa (5 a 8 MB) em que a pessoa mandava a prova e o sistema dizia que a IA
// estava fora. Eram 23 de 1310 prints.
//
// A correção de raiz é não deixar a foto grande sair do celular. Quem tira foto
// com a câmera manda 4000×3000; a IA não precisa disso pra ver um print.
//
// ⚠️ A IMPRESSÃO DIGITAL CONTINUA SENDO A DO ARQUIVO ORIGINAL. O hash SHA-256 é
// o que impede reaproveitar o print de ontem; ele é calculado sobre o arquivo
// que a PESSOA escolheu, nunca sobre o resultado do canvas. Se dependesse do
// canvas, a mesma foto reencodada em outro aparelho (ou noutra versão do
// navegador) daria hash diferente e furaria a trava.

/** O que a Anthropic aceita por imagem. Acima disso, 400 na certa. */
export const TETO_DA_IA = 5 * 1024 * 1024;

/** Alvo do encolhimento: folga proposital abaixo do teto. */
export const ALVO_DE_BYTES = 3 * 1024 * 1024;

/** Maior lado depois de encolher — sobra de resolução pra IA ler texto de print. */
export const LADO_MAXIMO = 2000;

/** Precisa encolher? Só imagem, e só quando passa do alvo. */
export function precisaEncolher(file, alvo = ALVO_DE_BYTES) {
  if (!file) return false;
  if (!/^image\//.test(file.type || '')) return false;
  // GIF pode ser animado: reencodar mataria a animação e não é o caso do print.
  if (file.type === 'image/gif') return false;
  return (file.size || 0) > alvo;
}

/** Medidas proporcionais para caber no lado máximo. Menor que isso não cresce. */
export function medidasParaCaber(largura, altura, ladoMax = LADO_MAXIMO) {
  const l = Number(largura) || 0;
  const a = Number(altura) || 0;
  if (l <= 0 || a <= 0) return null;
  const maior = Math.max(l, a);
  if (maior <= ladoMax) return { largura: l, altura: a, mudou: false };
  const fator = ladoMax / maior;
  return { largura: Math.round(l * fator), altura: Math.round(a * fator), mudou: true };
}

/** Qualidade do JPEG por tentativa — cai só até onde o print continua legível. */
export const QUALIDADES = [0.82, 0.7, 0.6];

/**
 * Devolve um File menor que o alvo, ou o ORIGINAL quando não dá pra encolher.
 *
 * 🔴 NUNCA BLOQUEIA O ENVIO. Navegador sem canvas, imagem que não decodifica,
 * qualquer tropeço — devolve o arquivo como veio. A prova da pessoa não pode
 * ficar presa por causa de uma otimização; quem recusa tamanho é o `validarPrint`.
 */
export async function encolherSePreciso(file, { alvo = ALVO_DE_BYTES, ladoMax = LADO_MAXIMO } = {}) {
  if (!precisaEncolher(file, alvo)) return file;

  try {
    const bitmap = await criarBitmap(file);
    if (!bitmap) return file;
    const medidas = medidasParaCaber(bitmap.width, bitmap.height, ladoMax);
    if (!medidas) return file;

    const tela = document.createElement('canvas');
    tela.width = medidas.largura;
    tela.height = medidas.altura;
    const pincel = tela.getContext('2d');
    if (!pincel) return file;
    pincel.drawImage(bitmap, 0, 0, medidas.largura, medidas.altura);
    bitmap.close?.();

    for (const qualidade of QUALIDADES) {
      const blob = await paraBlob(tela, qualidade);
      if (blob && blob.size <= alvo) {
        return new File([blob], trocarExtensao(file.name), { type: 'image/jpeg', lastModified: Date.now() });
      }
    }
    return file;
  } catch {
    return file;
  }
}

async function criarBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file); } catch { /* cai no <img> */ }
  }
  return new Promise((resolve) => {
    const endereco = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(endereco); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(endereco); resolve(null); };
    img.src = endereco;
  });
}

const paraBlob = (tela, qualidade) => new Promise((resolve) => {
  try { tela.toBlob(resolve, 'image/jpeg', qualidade); } catch { resolve(null); }
});

function trocarExtensao(nome) {
  const base = String(nome || 'print').replace(/\.[^.]+$/, '');
  return `${base || 'print'}.jpg`;
}
