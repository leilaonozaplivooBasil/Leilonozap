// custoProduto (servidor) — espelho de src/lib/custoProduto.js (DIR-18) +
// regra oficial de acerto do consignado (DIR-19). Vive em _lib porque as
// functions da Vercel só importam de ./ (mesma regra de finalizeAuctionCore).
//
// SEMÂNTICA OFICIAL: products.cost_price é o custo TOTAL do lote (é assim que
// a importação da planilha grava). Custo POR UNIDADE = lote ÷ (estoque atual
// + já vendidas).
const n = (v) => Number(v) || 0;

/** Custo por unidade: custo total do lote ÷ (estoque + vendidas). */
export const custoUnitario = (p) => {
  const totalUnidades = n(p.quantity) + n(p.quantity_sold);
  return totalUnidades > 0 ? n(p.cost_price) / totalUnidades : n(p.cost_price);
};

/**
 * ACERTO DO CONSIGNADO — regra oficial (dono, 30/08/2026, DIR-19): "igual é
 * no mercado". Na consignação de mercado, o lojista acerta POR UNIDADE
 * vendida, pelo preço de repasse combinado:
 *   1º preço de ATACADO por unidade (selling_price_wholesale) — a casa ganha
 *      a margem de repasse, o lojista revende acima disso;
 *   2º sem atacado cadastrado → CUSTO UNITÁRIO da casa (a casa ao menos
 *      recupera o que pagou);
 *   3º último recurso, produto sem atacado E sem custo → preço de catálogo
 *      (mercadoria nunca sai de graça — o furo de cadastro fica caro pro
 *      lojista, não pra casa, até alguém arrumar o produto).
 *
 * O bug que esta função mata (DIR-18/19): o acerto usava cost_price cru —
 * custo do LOTE — como se fosse preço de UMA peça. Num lote de 9 unidades a
 * R$ 2.296, o lojista era debitado R$ 2.296 POR PEÇA em vez de R$ 255.
 */
export const acertoConsignadoUnitario = (p) => {
  const atacado = n(p.selling_price_wholesale);
  if (atacado > 0) return atacado;
  const unit = custoUnitario(p);
  if (unit > 0) return unit;
  return n(p.price_catalog);
};
