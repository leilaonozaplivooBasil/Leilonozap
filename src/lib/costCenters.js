// DIR-7 (27/08/2026) — centro de custo: dimensão nova, separada de categoria, presente em
// financial_expenses E financial_income. Categoria = tipo de gasto/receita; centro de custo =
// qual unidade de negócio é dona daquele lançamento. Lista fixa e curta de propósito — cresce
// só se o negócio realmente precisar de mais uma unidade, não por categoria de produto.
export const COST_CENTERS = ['Leilões', 'Loja Virtual', 'Operacional'];
