/**
 * olharOVideo — a metade que precisa do navegador: decodificar e amostrar.
 *
 * Separado de `capaDoVideo.js` de propósito: aqui mora `<video>`, `<canvas>` e
 * URL de objeto, que não existem fora do navegador. As DECISÕES ficam lá, puras
 * e provadas sem abrir um Chromium. Aqui só se busca os números.
 *
 * 🔴 NUNCA BLOQUEIA O CADASTRO. Codec que o navegador não abre, arquivo
 * corrompido, aba que perdeu o foco no meio — tudo devolve "não sei", e quem
 * cadastra segue enviando o vídeo. Um aviso que impede de trabalhar quando ele
 * próprio falha é pior do que não existir.
 */
import { brilhoDoQuadro, momentosParaOlhar, ateQuandoEscuro } from './capaDoVideo.js';

/** Depois disto, desiste e deixa passar. Seek trava de verdade em arquivo ruim. */
const PACIENCIA_MS = 6000;

/** Amostra pequena: 64×36 já decide brilho, e é ~8x mais rápido que quadro cheio. */
const LARGURA = 64;
const ALTURA = 36;

/**
 * Olha os primeiros segundos do arquivo.
 * @param {File|Blob} arquivo
 * @returns {Promise<{escuroAte:number|null, tudoEscuro:boolean, olhou:boolean}>}
 *   `olhou:false` = não deu para analisar. A tela não avisa nada nesse caso.
 */
export async function olharOComeco(arquivo) {
  const naoSei = { escuroAte: null, tudoEscuro: false, olhou: false };
  if (!arquivo || typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') return naoSei;

  const endereco = URL.createObjectURL(arquivo);
  const v = document.createElement('video');
  v.preload = 'auto';
  v.muted = true;          // sem isto o navegador pode recusar a decodificação
  v.playsInline = true;
  v.src = endereco;

  const limpar = () => { try { v.removeAttribute('src'); v.load(); } catch { /* já morto */ } URL.revokeObjectURL(endereco); };

  try {
    const pronto = await new Promise((ok) => {
      const relogio = setTimeout(() => ok(false), PACIENCIA_MS);
      v.onloadedmetadata = () => { clearTimeout(relogio); ok(true); };
      v.onerror = () => { clearTimeout(relogio); ok(false); };
    });
    // 🔴 DURAÇÃO INFINITA É CASO REAL, não teoria. Vídeo gravado pelo próprio
    // navegador (MediaRecorder → .webm) sai com a duração ausente no cabeçalho:
    // o `duration` vem `Infinity` até alguém procurar o fim do arquivo. Sem
    // isto, `momentosParaOlhar` só olharia o instante 0 e um começo preto
    // viraria "escuro do começo ao fim" — o recado errado, mandando a pessoa
    // clarear um vídeo que só precisava de um corte.
    //
    // O contorno conhecido: pedir um instante absurdo. O navegador vai até o
    // fim, descobre onde é, e corrige o `duration`.
    if (pronto && v.duration === Infinity) {
      await new Promise((ok) => {
        const relogio = setTimeout(ok, 1500);
        v.ontimeupdate = () => {
          if (Number.isFinite(v.duration)) { clearTimeout(relogio); v.ontimeupdate = null; ok(); }
        };
        try { v.currentTime = 1e101; } catch { clearTimeout(relogio); ok(); }
      });
      try { v.currentTime = 0; } catch { /* segue: o laço abaixo procura de novo */ }
    }
    if (!pronto || !Number.isFinite(v.duration) || v.duration <= 0) { limpar(); return naoSei; }

    const tela = document.createElement('canvas');
    tela.width = LARGURA; tela.height = ALTURA;
    const pincel = tela.getContext('2d', { willReadFrequently: true });
    if (!pincel) { limpar(); return naoSei; }

    const amostras = [];
    const comeco = Date.now();
    for (const t of momentosParaOlhar(v.duration)) {
      // 🔴 O RELÓGIO GERAL, além do de cada seek: um arquivo que responde
      // devagar em TODOS os pontos somaria oito esperas e deixaria a pessoa
      // olhando "Enviando…" por quase um minuto.
      if (Date.now() - comeco > PACIENCIA_MS) break;
      const chegou = await new Promise((ok) => {
        const relogio = setTimeout(() => ok(false), 1500);
        v.onseeked = () => { clearTimeout(relogio); ok(true); };
        v.onerror = () => { clearTimeout(relogio); ok(false); };
        try { v.currentTime = t; } catch { clearTimeout(relogio); ok(false); }
      });
      if (!chegou) break;
      try {
        pincel.drawImage(v, 0, 0, LARGURA, ALTURA);
        amostras.push({ t, brilho: brilhoDoQuadro(pincel.getImageData(0, 0, LARGURA, ALTURA).data) });
      } catch {
        // canvas "sujo" (origem cruzada) lança no getImageData. Arquivo local
        // não suja, mas se sujar a análise para aqui em vez de derrubar a tela.
        break;
      }
    }
    limpar();
    if (amostras.length === 0) return naoSei;
    return { ...ateQuandoEscuro(amostras), olhou: true };
  } catch {
    limpar();
    return naoSei;
  }
}
