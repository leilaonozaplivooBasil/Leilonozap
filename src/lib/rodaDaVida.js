// 🎡 A RODA DA VIDA — a forma geométrica por trás do radar do Executivo
// Ideal (DIR-112, 09/09/2026). Dono, depois de ver a primeira versão (um
// pentágono): "quando eu falei a roda, é, ele faz, o painel dele virar uma
// roda de acordo, pra ele tem que ser quase dez em tudo, pra transformar
// numa roda... pra a vida andar." Um pentágono de lados retos NUNCA vira um
// círculo, não importa a nota — por isso "aparecia qualquer coisa menos uma
// roda". Aqui a ligação entre os 5 eixos é uma curva suave (Catmull-Rom)
// em vez de retas: com todo mundo perto de 100%, a curva fecha um círculo
// quase perfeito; um eixo fraco "amassa" a roda de um lado só, como um
// pneu murcho — a mesma metáfora, mas desenhada de verdade.
//
// Puro (sem SVG, sem jsPDF) pra ser a MESMA conta usada tanto no radar da
// tela (RadarEixos.jsx) quanto no radar do PDF (PdfExecutivo.jsx) — sem
// duas rodas que podem divergir.

/** Catmull-Rom entre 4 pontos de controle, em t (0-1) entre p1 e p2. */
function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

/**
 * Os pontos da curva fechada da roda, em coordenadas cartesianas centradas
 * em (0,0), raio 1 = o alvo (100%). `eixos`: [{atual (0-100)}, ...], na
 * MESMA ordem que os eixos aparecem ao redor do círculo.
 * `amostraPorEixo`: quantos pontos a curva desenha entre um eixo e o
 * próximo — mais pontos = curva mais lisa.
 */
export function pontosDaRoda(eixos = [], { amostraPorEixo = 16 } = {}) {
  const n = eixos.length;
  if (n < 3) return [];
  const angulo = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const raioDe = (i) => Math.max(0, Math.min(100, Number(eixos[((i % n) + n) % n]?.atual) || 0)) / 100;
  const p = (i) => { const a = angulo(i); const r = raioDe(i); return [Math.cos(a) * r, Math.sin(a) * r]; };
  const pontos = [];
  for (let i = 0; i < n; i += 1) {
    const p0 = p(i - 1); const p1 = p(i); const p2 = p(i + 1); const p3 = p(i + 2);
    for (let s = 0; s < amostraPorEixo; s += 1) {
      pontos.push(catmullRom(p0, p1, p2, p3, s / amostraPorEixo));
    }
  }
  return pontos;
}

/**
 * O ponto de UM eixo específico (não a curva — o vértice de verdade), pra
 * marcar o furo/dot de cada eixo em cima da curva.
 */
export function pontoDoEixo(eixos = [], i, raio = 1) {
  const n = eixos.length;
  const a = (Math.PI * 2 * i) / n - Math.PI / 2;
  const r = (Math.max(0, Math.min(100, Number(eixos[i]?.atual) || 0)) / 100) * raio;
  return [Math.cos(a) * r, Math.sin(a) * r];
}

/**
 * A "redondez" da roda: 0 (nada redondo/nada cheio) a 1 (círculo perfeito
 * na marca máxima) — o número que decide se ela "gira". Pondera dois
 * fatores: quão UNIFORMES são os 5 eixos entre si (desvio padrão baixo) e
 * quão CHEIA a roda está em média — uma roda pequena e uniforme (todo
 * mundo em 20%) é redonda, mas não é a roda "andando"; só conta como
 * "girando" quando cheia E uniforme ao mesmo tempo.
 */
export function redondezDaRoda(eixos = []) {
  const vals = eixos.map((e) => Math.max(0, Math.min(100, Number(e?.atual) || 0)));
  if (!vals.length) return 0;
  const media = vals.reduce((s, v) => s + v, 0) / vals.length;
  if (media <= 0) return 0;
  const variancia = vals.reduce((s, v) => s + (v - media) ** 2, 0) / vals.length;
  const desvio = Math.sqrt(variancia);
  const uniformidade = Math.max(0, 1 - desvio / media);
  return Math.max(0, Math.min(1, uniformidade * (media / 100)));
}

/** A leitura em palavras da redondez — pro rótulo embaixo da roda, na tela e no PDF. */
export function faixaDaRoda(redondez) {
  const r = Number(redondez) || 0;
  if (r >= 0.85) return { id: 'girando', rotulo: 'a roda GIRA — a vida anda', emoji: '🎡' };
  if (r >= 0.6) return { id: 'quase', rotulo: 'quase lá — falta pouco pra fechar a roda', emoji: '🛞' };
  if (r >= 0.3) return { id: 'torta', rotulo: 'a roda está torta — dá pra sentir o solavanco', emoji: '⚠️' };
  return { id: 'murcha', rotulo: 'a roda ainda não gira — falta encher os eixos', emoji: '🚧' };
}
