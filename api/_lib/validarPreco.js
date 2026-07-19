// validarPreco — validação obrigatória de preço antes de PUBLICAR na loja (spec do Heloim, 18/07).
// Garante 100% de assertividade: nenhum produto sobe com preço absurdo (10x o real) nem abaixo do custo.
// Campos do NoZap: cost=cost_price, selling=selling_price_retail(=price_catalog), market=market_value.
// Retorna { ok, motivo } — se ok=false, NÃO publica.

const TETO_CUSTO = 5;      // venda no máx 5x o custo (acima = busca casou produto errado)
const TETO_MERCADO_CUSTO = 10; // mercado no máx 10x o custo (acima = erro de parsing/produto errado)
const TETO_VENDA_MERCADO = 2;  // venda no máx 2x o mercado

export function validarPrecoLoja({ cost, selling, market }) {
  const c = Number(cost) || 0;
  const v = Number(selling) || 0;
  const m = Number(market) || 0;

  if (!(v > 0)) return { ok: false, motivo: 'sem_preco_venda' };

  // CHECK 1 — custo vs venda
  if (c >= 1) {
    if (v < c) return { ok: false, motivo: `venda (R$${v}) abaixo do custo (R$${c})` };
    if (v > c * TETO_CUSTO) return { ok: false, motivo: `venda (R$${v}) acima de ${TETO_CUSTO}x o custo (R$${c})` };
    if (m > 0 && m > c * TETO_MERCADO_CUSTO) return { ok: false, motivo: `mercado (R$${m}) acima de ${TETO_MERCADO_CUSTO}x o custo — provável erro de busca` };
  }

  // CHECK 2 — venda vs mercado
  if (m > 0) {
    if (v > m) return { ok: false, motivo: `venda (R$${v}) maior que o mercado (R$${m}) — sem desconto` };
    if (v > m * TETO_VENDA_MERCADO) return { ok: false, motivo: `venda (R$${v}) acima de ${TETO_VENDA_MERCADO}x o mercado` };
  }

  return { ok: true, motivo: 'ok' };
}
