// 🏷️ 02/09/2026 — AS SEÇÕES DA LOJA VIRTUAL.
//
// Mesmos nomes das pílulas da área de leilão, a pedido do dono, mas aqui elas
// FILTRAM os produtos desta loja em vez de levar o cliente para o leilão (o
// AuctionSectorLinks é feito de <Link>; copiado, jogaria para fora da vitrine
// quem está comprando).
//
// ⚠️ REGISTRO HONESTO DO QUE ESTES RÓTULOS SIGNIFICAM.
// O dado por trás é CONDIÇÃO, não procedência. Vem da grade da planilha do lote
// (qty_perfeito / qty_bom), recuperada em 02/09:
//
//     "Direto de Fábrica"      → condicao = 'perfeito'  (grade A)
//     "Arremate & Devoluções"  → condicao = 'bom'       (grade B/C)
//     "Collection"             → is_featured            (produto em destaque)
//
// Na medição de 02/09, 182 dos 263 produtos com condicao='perfeito' na vitrine
// vinham de lote de arremate/devolução (LOTE ARREMATADO M.L, LOTE 46-48 -
// ARREMATADO). Ou seja: o rótulo "Direto de Fábrica" NÃO é sustentado pelo campo
// que ele filtra. Isso foi apresentado ao dono com o número na frente, e ele
// decidiu pelos nomes comerciais assim mesmo. É decisão dele — fica escrito aqui
// para quem vier depois não tomar isto por um mapeamento verificado.
//
// O caminho para os rótulos ficarem verdadeiros já existe: `product_source` é
// campo do cadastro e tem marcação EM LOTE na Gestão de Estoque. Classificada a
// base, basta trocar os predicados abaixo por `p.product_source === 'factory_new'`
// e `=== 'return_resale'`. Nada mais muda.

export const SECOES = [
  { valor: 'fabrica', rotulo: 'Direto de Fábrica', icone: 'Sparkles', casa: (p) => p?.condicao === 'perfeito' },
  { valor: 'arremate', rotulo: 'Arremate & Devoluções', icone: 'Flame', casa: (p) => p?.condicao === 'bom' },
  { valor: 'collection', rotulo: 'Collection', icone: 'Crown', casa: (p) => Boolean(p?.is_featured) },
];

const PORVALOR = new Map(SECOES.map((s) => [s.valor, s]));

/** Um produto pertence à seção? 'todas' (ou vazio) não filtra nada. */
export function produtoNaSecao(produto, filtro) {
  if (!filtro || filtro === 'todas') return true;
  const secao = PORVALOR.get(filtro);
  return secao ? secao.casa(produto) : true;
}

/** Quantos produtos em cada seção. Seção sem produto não é oferecida.
 *  Um produto pode contar em duas (destaque + condição), de propósito. */
export function contarPorSecao(produtos) {
  const lista = Array.isArray(produtos) ? produtos : [];
  const contagem = {};
  for (const s of SECOES) contagem[s.valor] = 0;
  for (const p of lista) {
    if (!p) continue;
    for (const s of SECOES) if (s.casa(p)) contagem[s.valor] += 1;
  }
  return contagem;
}
