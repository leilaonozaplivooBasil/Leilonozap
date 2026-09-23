// 🧾 A FICHA DO LEILÃO — origem, condição e garantia, a partir do que o leilão sabe.
//
// 🔴 POR QUE ISTO EXISTE (23/09/2026)
// A página do leilão dizia, FIXO no código, "Origem: Devolução/Arremate ·
// Condição: Testado e Funcional · Garantia: Sem Garantia*" — e um selo
// "Produto Testado, 100% funcional" — para TODO leilão. O PS5 do pré-lançamento
// é novo de fábrica, lacrado, com garantia. A página mentia contra o produto
// e contra a venda.
//
// O leilão já sabe a origem: `auctions.product_source` ('factory_new' |
// 'return_resale'), o mesmo vocabulário de src/lib/origemProduto.js. É dele que
// a ficha sai. Sem origem informada (7 leilões antigos, todos encerrados), fica
// o texto de devolução — é o caso comum da casa e não promete nada a mais.

import { rotuloOrigem } from './origemProduto.js';

export const FICHAS = Object.freeze({
  factory_new: Object.freeze({
    condicao: 'Novo e lacrado',
    garantia: 'Garantia de fábrica',
    notaRodape: null,
    selo: Object.freeze({ titulo: 'Produto Novo', texto: 'Lacrado, direto de fábrica, com garantia do fabricante' }),
  }),
  return_resale: Object.freeze({
    condicao: 'Testado e Funcional',
    garantia: 'Sem Garantia*',
    notaRodape: '* Produtos sem garantia de fábrica, por isso o preço especial.',
    selo: Object.freeze({ titulo: 'Produto Testado', texto: '100% funcional, verificado pela nossa equipe técnica' }),
  }),
});

/**
 * A ficha de UM leilão. Origem desconhecida cai em devolução (a promessa menor).
 *
 * O rótulo da origem NÃO mora aqui: vem de src/lib/origemProduto.js, o
 * vocabulário único. A primeira versão tinha uma cópia do texto em cada ficha,
 * e a prova por mutação mostrou que trocar a fonte não mudava nada — duas
 * fontes iguais é o desencontro de amanhã. Agora só existe uma.
 */
export function fichaDoLeilao(leilao) {
  const chave = String(leilao?.product_source || '');
  const conhecida = Object.prototype.hasOwnProperty.call(FICHAS, chave);
  const base = conhecida ? FICHAS[chave] : FICHAS.return_resale;
  const origem = rotuloOrigem(conhecida ? chave : 'return_resale');
  return { ...base, origem, ehNovo: chave === 'factory_new' };
}
