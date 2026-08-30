// custoProduto — regra ÚNICA de interpretação do campo products.cost_price.
//
// SEMÂNTICA OFICIAL (confirmada pelo dono, 30/08/2026): cost_price é o custo
// TOTAL do lote — é assim que a importação da planilha grava
// (api/functions/bulkImportProducts.js: "custo da compra (planilha)") e assim
// que o cadastro de lotes calcula (RegisterBatches.jsx: custo_por_unidade ×
// quantidade). O custo POR UNIDADE se obtém dividindo pelo total de unidades
// que o lote já teve (em estoque + já vendidas).
//
// A maior parte do sistema sempre fez certo (ProductManagement "Custo Unit.",
// StockPosition, PriceCalculatorModal, PainelLucroDiario). Mas 6 telas
// tratavam cost_price como custo UNITÁRIO e multiplicavam pela quantidade —
// resultado real visto em produção: "Valor Investido em Estoque:
// R$ 50 milhões" pra 302 produtos cujo valor de venda era R$ 4,9 milhões
// (custo 10× o preço de venda, impossível). Este módulo existe pra ninguém
// mais reinterpretar o campo na mão.
const n = (v) => Number(v) || 0;

/** Custo por unidade: custo total do lote ÷ (estoque atual + já vendidas).
 *  Lote sem nenhuma unidade registrada devolve o cost_price cru (item único
 *  antigo, sem quantity preenchida). */
export const custoUnitario = (p) => {
  const totalUnidades = n(p.quantity) + n(p.quantity_sold);
  return totalUnidades > 0 ? n(p.cost_price) / totalUnidades : n(p.cost_price);
};

/** Quanto do custo do lote ainda está parado em estoque (custo unitário ×
 *  unidades restantes). É isto que "Valor Investido em Estoque" deve somar. */
export const custoEstoqueRestante = (p) => custoUnitario(p) * n(p.quantity);
