// 🏭 02/09/2026 — ORIGEM DO PRODUTO NA LOJA VIRTUAL.
//
// A área de leilão tem as pílulas "Direto de Fábrica", "Arremate & Devoluções" e
// "Collection". A Loja Virtual não tinha nenhuma, e o motivo não era de tela: o campo
// `product_source` existe SÓ na tabela `auctions`. A loja vende `products`, que não
// tinha essa informação em lugar nenhum.
//
// Também não dava para deduzir, e isso foi conferido no retrato de estoque:
//   · `linked_auctions` preenchido em 3 produtos de 3.543
//   · `purchase_order` vazio em 94%
//   · `lot` diz o lote, mas os 4 lotes grandes misturam fábrica e devolução
//     (confirmado pela operação em 02/09) — classificar por lote diria mentira
//     para uma parte dos produtos
//
// Por isso a origem é preenchida por quem cadastra, e fica NULL enquanto ninguém
// informou. Sem chute: um produto marcado "Direto de Fábrica" por engano é
// exatamente o tipo de promessa que gera a reclamação que estamos tentando parar.
//
// Os valores são os MESMOS de auctions.product_source, de propósito: um dia produto
// e leilão precisam conversar, e dois vocabulários para a mesma ideia seria dívida.

export const ORIGENS = [
  { valor: 'factory_new',   rotulo: 'Direto de Fábrica',       icone: 'Sparkles' },
  { valor: 'return_resale', rotulo: 'Arremate & Devoluções',   icone: 'Flame' },
];

const PORVALOR = new Map(ORIGENS.map((o) => [o.valor, o]));

export function ehOrigemValida(valor) {
  return PORVALOR.has(String(valor || ''));
}

export function rotuloOrigem(valor) {
  return PORVALOR.get(String(valor || ''))?.rotulo || '';
}

// 🎖️ "Collection" é a terceira pílula do print. No leilão ela é uma página própria
// (LuxuryCollection); na loja, por decisão da operação em 02/09, ela seleciona os
// produtos em destaque — o campo `is_featured`, que já existe e já é usado pela
// seção "⭐ Produtos em Destaque". Não é a mesma ideia que "luxo", e isso está
// registrado aqui para o dia em que quiserem um critério próprio de curadoria.
export const FILTRO_COLLECTION = 'collection';

export function produtoNoFiltro(produto, filtro) {
  if (!filtro || filtro === 'todos') return true;
  if (filtro === FILTRO_COLLECTION) return Boolean(produto?.is_featured);
  return produto?.product_source === filtro;
}

/** Conta quantos produtos caem em cada pílula. Pílula com 0 não é exibida — abrir
 *  uma seção vazia é pior que não oferecer a seção. */
export function contarPorFiltro(produtos) {
  const lista = Array.isArray(produtos) ? produtos : [];
  const contagem = { [FILTRO_COLLECTION]: 0 };
  for (const o of ORIGENS) contagem[o.valor] = 0;
  for (const p of lista) {
    if (!p) continue;
    if (PORVALOR.has(p.product_source)) contagem[p.product_source] += 1;
    if (p.is_featured) contagem[FILTRO_COLLECTION] += 1;
  }
  return contagem;
}
