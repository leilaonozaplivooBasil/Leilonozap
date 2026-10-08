// 📦 MEDIDAS E PESO DO PRODUTO — a régua única (08/10/2026, DIR-207).
//
// Dono: "a IA tem que pegar todas as medidas… está acontecendo um erro,
// ela não está botando o peso correto… caso eu não importe, tem que ter o
// espaço manual". Medido antes de mexer: 2.819 dos 2.858 produtos sem peso,
// e o frete (api/_lib/frete.js) trata 0 e null do mesmo jeito — caixa padrão
// de 0,3 kg e 11×4×16 cm, em silêncio. Uma geladeira ia para a Melhor Envio
// pesando 300 gramas.
//
// Este arquivo é PURO (sem rede, sem React) e é importado pelas TRÊS pontas:
// a tela de produto da gestão, o editor do leilão e as rotas do servidor.
// Se a regra do que é uma medida válida morar em três lugares, ela diverge.
//
// Unidades: peso em QUILOS, medidas em CENTÍMETROS — as mesmas colunas
// products.peso/altura/largura/comprimento que o frete lê.

/** Faixas de sanidade. Fora delas o valor é recusado e vira aviso, nunca gravado. */
export const LIMITES = Object.freeze({
  peso: Object.freeze({ min: 0.005, max: 80 }),   // 5 g a 80 kg (geladeira grande ~70 kg)
  cm: Object.freeze({ min: 0.5, max: 250 }),       // meio centímetro a 2,5 m
});

/** A caixa que o frete usa quando falta medida — espelha api/_lib/frete.js:44-47. */
export const CAIXA_PADRAO = Object.freeze({ peso: 0.3, altura: 4, largura: 11, comprimento: 16 });
const PISO = Object.freeze({ peso: 0.1, altura: 2, largura: 11, comprimento: 16 });

/** De onde veio a medida gravada. */
export const ORIGENS_MEDIDA = Object.freeze({
  manual: 'Medida informada à mão',
  pagina: 'Lida da página do produto',
  estimativa_ia: 'Estimativa da IA (conferir)',
});

export const CAMPOS_MEDIDA = Object.freeze(['peso', 'altura', 'largura', 'comprimento']);

/** Número a partir do que a pessoa digitou: aceita vírgula, espaço, 'kg'/'cm' colados. Vazio → null. */
export function numeroDigitado(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim().toLowerCase().replace(/kg|g\b|cm|mm/g, '').replace(/\s+/g, '').replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normaliza as quatro medidas. Devolve o que pode ser GRAVADO e os avisos.
 *   valores:   {peso, altura, largura, comprimento} — null = não informado
 *   avisos:    frases curtas para a tela
 *   completas: as quatro presentes e dentro da faixa
 * Regra: vazio vira null (nunca 0); fora da faixa vira null + aviso. Quem
 * digitou 1500 no peso provavelmente pensou em gramas: a frase diz isso.
 */
export function normalizarMedidas(entrada = {}) {
  const valores = { peso: null, altura: null, largura: null, comprimento: null };
  const avisos = [];
  for (const campo of CAMPOS_MEDIDA) {
    const n = numeroDigitado(entrada[campo]);
    if (n === null) continue;
    if (n <= 0) { avisos.push(`${rotulo(campo)}: zero não é medida — deixe em branco se não souber.`); continue; }
    const faixa = campo === 'peso' ? LIMITES.peso : LIMITES.cm;
    if (n < faixa.min) { avisos.push(`${rotulo(campo)}: ${n} é menor que o mínimo (${faixa.min}${campo === 'peso' ? ' kg' : ' cm'}).`); continue; }
    if (n > faixa.max) {
      avisos.push(campo === 'peso'
        ? `Peso: ${n} kg passa do máximo (${faixa.max} kg). Se você pensou em gramas, ${n} g = ${(n / 1000).toFixed(3).replace('.', ',')} kg.`
        : `${rotulo(campo)}: ${n} cm passa do máximo (${faixa.max} cm). Se você pensou em milímetros, ${n} mm = ${(n / 10).toFixed(1).replace('.', ',')} cm.`);
      continue;
    }
    valores[campo] = campo === 'peso' ? Math.round(n * 1000) / 1000 : Math.round(n * 10) / 10;
  }
  const completas = CAMPOS_MEDIDA.every((c) => valores[c] !== null);
  return { valores, avisos, completas };
}

export function rotulo(campo) {
  return { peso: 'Peso', altura: 'Altura', largura: 'Largura', comprimento: 'Comprimento' }[campo] || campo;
}

/** Falta alguma das quatro? (0, null, '' e fora da faixa contam como falta — igual ao frete) */
export function faltamMedidas(produto) {
  if (!produto) return true;
  return !normalizarMedidas(produto).completas;
}

/**
 * A caixa que o frete VAI usar com o que está gravado — a mesma conta de
 * api/_lib/frete.js e melhorEnvioShipment.js (pisos e caixa padrão).
 * `padrao` = alguma medida caiu no padrão, ou seja, o frete está chutando.
 */
export function caixaDoFrete(produto) {
  const { valores } = normalizarMedidas(produto || {});
  const faltou = CAMPOS_MEDIDA.filter((c) => valores[c] === null);
  const caixa = {
    peso: Math.max(PISO.peso, valores.peso ?? CAIXA_PADRAO.peso),
    altura: Math.max(PISO.altura, valores.altura ?? CAIXA_PADRAO.altura),
    largura: Math.max(PISO.largura, valores.largura ?? CAIXA_PADRAO.largura),
    comprimento: Math.max(PISO.comprimento, valores.comprimento ?? CAIXA_PADRAO.comprimento),
  };
  return { ...caixa, padrao: faltou.length > 0, faltou };
}

const kg = (n) => `${(Number(n) || 0).toFixed(n < 1 ? 3 : 2).replace('.', ',')} kg`;
const cm = (n) => `${Number.isInteger(n) ? n : n.toFixed(1).replace('.', ',')}`;

/** "0,300 kg · 16×11×4 cm" (comprimento × largura × altura, como a etiqueta). */
export function resumoDaCaixa(caixa) {
  if (!caixa) return '';
  return `${kg(caixa.peso)} · ${cm(caixa.comprimento)}×${cm(caixa.largura)}×${cm(caixa.altura)} cm`;
}

/** Texto para o campo (number input aceita ponto): null → '' */
export function textoDoCampo(v) {
  const n = numeroDigitado(v);
  return n === null || n <= 0 ? '' : String(n);
}

/** Gramas → quilos quando a origem diz que o número veio em gramas. */
export function pesoEmKg(valor, unidade) {
  const n = numeroDigitado(valor);
  if (n === null) return null;
  const u = String(unidade || '').toLowerCase();
  if (u === 'g' || u === 'gramas' || u === 'grama') return Math.round(n) / 1000;
  if (u === 'mg') return n / 1e6;
  return n; // kg (ou sem unidade: assume kg)
}

/** Milímetros/metros → centímetros. */
export function medidaEmCm(valor, unidade) {
  const n = numeroDigitado(valor);
  if (n === null) return null;
  const u = String(unidade || '').toLowerCase();
  if (u === 'mm') return n / 10;
  if (u === 'm' || u === 'metros' || u === 'metro') return n * 100;
  return n; // cm
}
