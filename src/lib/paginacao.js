// 📚 SEM TETO DE MIL — 30/09/2026
//
// O Supabase devolve no máximo 1.000 linhas por chamada, mesmo quando a tela
// pede 5.000. Ontem a base de cadastros passou de 1.000 e o Sistema de
// Alavancagem travou em "1000 no sistema": 34 pessoas sumiram da árvore e não
// podiam ser editadas nem movidas. O mesmo teto já valia, em silêncio, para
// comissões (1.573 linhas) e para qualquer lista que crescer.
//
// A regra passa a ser: quem quer a lista inteira pede em páginas de 1.000 até
// vir uma página curta. Este arquivo é a única implementação disso — JS puro,
// testado no Node, sem depender do cliente do banco.

/** Tamanho máximo que o Supabase devolve numa chamada. */
export const TAMANHO_PAGINA = 1000;

/**
 * Busca tudo, página por página.
 *
 * @param {(offset:number, tamanho:number) => Promise<any[]>} buscarPagina
 *   devolve as linhas de [offset, offset+tamanho). Página menor que `tamanho`
 *   (ou vazia) encerra a busca.
 * @param {object} [opts]
 * @param {number} [opts.tamanho=1000]  tamanho da página
 * @param {number} [opts.limite]        teto opcional de linhas (undefined = tudo)
 * @param {number} [opts.maxPaginas=500] trava de segurança contra loop infinito
 */
export async function tudoEmPaginas(buscarPagina, { tamanho = TAMANHO_PAGINA, limite, maxPaginas = 500 } = {}) {
  const tudo = [];
  let offset = 0;
  for (let pagina = 0; pagina < maxPaginas; pagina++) {
    const faltam = Number.isFinite(limite) ? limite - tudo.length : Infinity;
    if (faltam <= 0) break;
    const pedir = Math.min(tamanho, faltam);
    const linhas = await buscarPagina(offset, pedir);
    const lista = Array.isArray(linhas) ? linhas : [];
    tudo.push(...lista);
    if (lista.length < pedir) break; // página curta: acabou
    offset += lista.length;
  }
  return Number.isFinite(limite) ? tudo.slice(0, limite) : tudo;
}

/**
 * Precisa paginar? Só quando a tela pediu, explicitamente, mais do que uma
 * chamada devolve. Sem limite continua sendo UMA chamada (o teto do Supabase),
 * como sempre foi — quem quer a base inteira chama listAll/filterAll.
 */
export function precisaPaginar(limite) {
  return Number.isFinite(limite) && limite > TAMANHO_PAGINA;
}
