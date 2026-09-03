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

// 🏷️ 02/09/2026 — A VITRINE DEIXOU DE FILTRAR POR ORIGEM.
//
// As pílulas da loja passaram a ser por CONDIÇÃO (ver PilulasCondicao e
// @/lib/condicaoProduto). Motivo: origem só se preenche à mão — os 4 lotes que
// concentram 90% da base misturam fábrica e devolução — e as três pílulas ficavam
// em 0. A condição já estava no banco desde a importação, nos contadores qty_*,
// e cobre 289 dos 299 produtos da vitrine.
//
// Este arquivo continua vivo de propósito: `product_source` segue como campo do
// cadastro (Gestão de Estoque e cadastro rápido) e como marcação em lote. Quando
// houver base classificada, voltar a oferecer o filtro é só religar.
// As funções de filtro/contagem que existiam aqui foram removidas por não terem
// mais nenhum uso — código morto foi o que gerou o bug da rolagem das categorias.
