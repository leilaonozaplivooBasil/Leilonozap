// baixaEstoque — REGRA ÚNICA DE BAIXA DE ESTOQUE (08/08/2026).
//
// Todo caminho de venda (loja virtual, PDV, retirada) baixa por AQUI, na mesma ordem:
//   1) estoque do vendedor com origem='comprado'    → é dele, ele já pagou;
//   2) estoque do vendedor com origem='consignado'  → é dele, com dívida em aberto;
//   3) estoque central (products)                   → comportamento de sempre.
//
// Por que uma função só: quando cada tela tinha a sua regra, a mesma peça podia
// sair do estoque central numa venda e do estoque da loja em outra — e o dinheiro
// ia pro lugar errado. Aqui a ordem é uma só, para todos.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

// ordem de consumo do estoque próprio
const PRIORIDADE = ['comprado', 'consignado'];

/**
 * Baixa UM item respeitando a prioridade do estoque do dono.
 * @returns {{ consumos: Array, restante: number }} consumos = o que saiu do estoque PRÓPRIO
 */
export async function baixarItemPriorizandoDono({ ownerId, productId, qty, unit = 0 }) {
  const now = new Date().toISOString();
  let restante = Math.max(0, Number(qty) || 0);
  const consumos = [];
  if (!productId || restante <= 0) return { consumos, restante };

  if (ownerId) {
    const linhas = await (await sb(
      `store_inventory?select=id,quantity,origem,custo_unitario,divida_aberta&owner_id=eq.${encodeURIComponent(ownerId)}&product_id=eq.${encodeURIComponent(productId)}`
    )).json();
    const lista = Array.isArray(linhas) ? linhas : [];

    for (const origem of PRIORIDADE) {
      if (restante <= 0) break;
      for (const li of lista.filter((l) => (l.origem || 'central') === origem)) {
        if (restante <= 0) break;
        const disp = Math.max(0, Number(li.quantity) || 0);
        if (disp <= 0) continue;
        const usar = Math.min(disp, restante);
        const novaQtd = disp - usar;
        await sb(`store_inventory?id=eq.${encodeURIComponent(li.id)}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ quantity: novaQtd, active: novaQtd > 0, updated_at: now }),
        });
        consumos.push({
          product_id: String(productId), origem, qty: usar,
          custo_unitario: round2(li.custo_unitario),
          divida_unitaria: origem === 'consignado' ? round2(li.custo_unitario) : 0,
          inventory_id: li.id, unit: round2(unit),
        });
        restante -= usar;
      }
    }

    // 🔁 compatibilidade: estoque antigo da loja (sem coluna origem preenchida) continua
    // baixando normalmente — só não gera repasse, porque não tem custo registrado.
    if (restante > 0) {
      for (const li of lista.filter((l) => !PRIORIDADE.includes(l.origem || 'central'))) {
        if (restante <= 0) break;
        const disp = Math.max(0, Number(li.quantity) || 0);
        if (disp <= 0) continue;
        const usar = Math.min(disp, restante);
        const novaQtd = disp - usar;
        await sb(`store_inventory?id=eq.${encodeURIComponent(li.id)}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ quantity: novaQtd, active: novaQtd > 0, updated_at: now }),
        });
        restante -= usar;
      }
    }
  }

  return { consumos, restante };
}

/** Baixa do estoque central (products) — comportamento de sempre. */
export async function baixarCentral({ productId, qty, unit = 0 }) {
  if (!productId || qty <= 0) return false;
  const now = new Date().toISOString();
  const pArr = await (await sb(`products?select=id,quantity,quantity_sold,sold_amount&id=eq.${encodeURIComponent(productId)}&limit=1`)).json();
  const p = Array.isArray(pArr) ? pArr[0] : null;
  if (!p || p.quantity === null || p.quantity === undefined) return false;
  const novaQtd = Math.max(0, (Number(p.quantity) || 0) - qty);
  await sb(`products?id=eq.${encodeURIComponent(productId)}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      quantity: novaQtd,
      quantity_sold: (Number(p.quantity_sold) || 0) + qty,
      sold_amount: round2((Number(p.sold_amount) || 0) + (Number(unit) || 0) * qty),
      status: novaQtd > 0 ? 'ESTOQUE' : 'VENDIDO',
      updated_date: now,
    }),
  });
  return true;
}

/**
 * Baixa uma lista de itens de uma venda inteira.
 * @param items [{ product_id, qty, unit, title }]
 * @returns { consumos } — só o que saiu do estoque PRÓPRIO (gera repasse)
 */
export async function baixarItensDaVenda({ ownerId, items }) {
  const consumos = [];
  for (const it of items || []) {
    const productId = String(it.product_id || '');
    const qty = Math.max(1, Number(it.qty) || Number(it.quantity) || 1);
    const unit = Number(it.unit) || Number(it.price) || 0;
    if (!productId) continue;
    const r = await baixarItemPriorizandoDono({ ownerId, productId, qty, unit });
    for (const c of r.consumos) consumos.push({ ...c, title: it.title || null });
    if (r.restante > 0) await baixarCentral({ productId, qty: r.restante, unit });
  }
  return { consumos };
}