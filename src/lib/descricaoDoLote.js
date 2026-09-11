// 📜 A descrição do lote na sala do leilão — sem esconder o aviso do final.
//
// ══════════════════════════════════════════════════════════════════════════════
// O PROBLEMA QUE ISTO RESOLVE
// ══════════════════════════════════════════════════════════════════════════════
// O painel da sala mostrava a descrição dentro de uma caixa de 60px com
// `overflow: hidden`. Três linhas, e o resto sumia — sem aviso, sem "ver mais",
// sem barra de rolagem.
//
// Na Bike Harley M4 (11/09/2026) a descrição tem 734 caracteres e termina em
// "OBS: SEM O CARREGADOR". Ou seja: a única informação que muda a decisão de
// compra era exatamente a que nunca aparecia. Quem deu R$ 897,00 achando que
// levava o carregador junto tinha razão de reclamar.
//
// ══════════════════════════════════════════════════════════════════════════════
// A REGRA
// ══════════════════════════════════════════════════════════════════════════════
// Encurtar texto de venda é legítimo — o painel tem lance, disputa e feed
// embaixo. Esconder ressalva não é. Então o resumo corta o meio, nunca o aviso:
// a linha de OBS/ATENÇÃO/IMPORTANTE do final sobe junto com o começo do texto e
// fica visível mesmo com a descrição fechada.

/** Quantos caracteres o resumo mostra antes do "ver mais". */
export const LIMITE_RESUMO = 220;

/** Palavras que marcam uma ressalva — o que o comprador PRECISA ler. */
export const MARCADORES_DE_AVISO = Object.freeze([
  'obs', 'obs.', 'obs:', 'observação', 'observacao', 'atenção', 'atencao',
  'importante', 'aviso', 'nota', 'ressalva',
]);

/** Texto limpo: sem espaço nas pontas e sem \r do Windows. */
function limpar(texto) {
  return String(texto ?? '').replace(/\r\n?/g, '\n').trim();
}

function ehLinhaDeAviso(linha) {
  const inicio = linha.trim().toLowerCase().replace(/^[•\-*\s]+/, '');
  return MARCADORES_DE_AVISO.some((m) =>
    inicio.startsWith(`${m}:`) || inicio.startsWith(`${m} `) || inicio === m);
}

/**
 * A ressalva do final da descrição, se existir.
 *
 * Procura de baixo para cima e para na primeira linha que começa com marcador —
 * é sempre o último parágrafo que carrega o "OBS:", não o primeiro.
 *
 * @param {unknown} texto
 * @returns {string} a linha inteira do aviso, ou '' quando não há
 */
export function linhaDeAviso(texto) {
  const linhas = limpar(texto).split('\n').map((l) => l.trim()).filter(Boolean);
  for (let i = linhas.length - 1; i >= 0; i -= 1) {
    if (ehLinhaDeAviso(linhas[i])) return linhas[i];
  }
  return '';
}

/**
 * Quebra a descrição em três partes para o painel fechado.
 *
 * @param {unknown} texto
 * @param {number} [limite]
 * @returns {{completo:string, resumo:string, aviso:string, cortou:boolean}}
 *   - `completo` é o texto inteiro (usado quando o usuário abre)
 *   - `resumo`   é o começo, cortado em fronteira de palavra
 *   - `aviso`    é a ressalva do final, que aparece SEMPRE
 *   - `cortou`   diz se sobrou coisa escondida (é o que liga o "ver mais")
 */
export function resumoDaDescricao(texto, limite = LIMITE_RESUMO) {
  const completo = limpar(texto);
  const aviso = linhaDeAviso(completo);

  // O que o resumo encurta é só o corpo; a ressalva é mostrada à parte para não
  // competir por espaço com ela mesma.
  const corpo = aviso ? completo.replace(aviso, '').trim() : completo;

  if (corpo.length <= limite) {
    return { completo, resumo: corpo, aviso, cortou: false };
  }

  let corte = corpo.slice(0, limite);
  const ultimoEspaco = corte.lastIndexOf(' ');
  if (ultimoEspaco > limite * 0.6) corte = corte.slice(0, ultimoEspaco);

  return {
    completo,
    resumo: `${corte.replace(/[\s.,;:•-]+$/, '')}…`,
    aviso,
    cortou: true,
  };
}

/** Tem texto escondido? É isto que decide se o botão "ver mais" aparece. */
export function precisaDeVerMais(texto, limite = LIMITE_RESUMO) {
  return resumoDaDescricao(texto, limite).cortou;
}
