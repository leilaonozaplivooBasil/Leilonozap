// Helper (não é rota — pasta _lib é ignorada pela Vercel): conclui um pedido ONLINE de loja
// quando o pagamento confirma. Baixa o estoque DA LOJA e paga a comissão pro dono + override
// pela cadeia (telescópio, teto 20%). Idempotência fica por conta do webhook (só chama 1x).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

// store owner ganha a venda_direta_pct do nível dele; a cadeia acima ganha override (cap 20%)
async function payStoreCommissions(sale) {
  const value = Number(sale.total_amount) || 0;
  const ownerId = sale.seller_id;
  if (!value || !ownerId) return 0;
  const levels = Object.fromEntries((await (await sb('career_levels?select=id,venda_direta_pct')).json()).map((l) => [l.id, l]));
  const ovRows = await (await sb('commission_overrides?select=earner_level,on_level,pct&condicao=eq.direto')).json();
  const ov = {}; (Array.isArray(ovRows) ? ovRows : []).forEach((r) => { (ov[r.earner_level] = ov[r.earner_level] || {})[r.on_level] = r.pct; });

  // cadeia começando NO dono da loja: [dono, upline1, upline2, ...]
  const chain = [];
  let node = (await (await sb(`app_users?select=id,full_name,primary_career_level,referred_by_id,commission_balance&id=eq.${encodeURIComponent(ownerId)}&limit=1`)).json())?.[0];
  while (node && chain.length < 11) {
    chain.push(node);
    if (!node.referred_by_id) break;
    node = (await (await sb(`app_users?select=id,full_name,primary_career_level,referred_by_id,commission_balance&id=eq.${encodeURIComponent(node.referred_by_id)}&limit=1`)).json())?.[0];
  }

  const cap = 0.20 * value; let running = 0; let total = 0;
  for (let i = 0; i < chain.length && running < cap - 0.001; i++) {
    const earner = chain[i];
    const child = i === 0 ? null : chain[i - 1];
    const pct = i === 0
      ? Number(levels[earner.primary_career_level]?.venda_direta_pct || 0)
      : Number((ov[earner.primary_career_level] || {})[child.primary_career_level] || 0);
    let amount = round2(value * pct / 100);
    if (running + amount > cap) amount = round2(cap - running);
    if (amount > 0.001) {
      await sb('commission_ledger', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
        sale_id: sale.id, beneficiary_id: earner.id, beneficiary_name: earner.full_name, beneficiary_level: earner.primary_career_level,
        role_in_sale: i === 0 ? 'venda_loja' : 'override', pct, amount,
      }) });
      await sb(`app_users?id=eq.${earner.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_balance: round2((Number(earner.commission_balance) || 0) + amount) }) });
      running += amount; total += amount;
    }
  }
  return round2(total);
}

export async function fulfillStoreOrder(sale) {
  const now = new Date().toISOString();
  // baixa o estoque da loja item a item (qty=0 → inativo)
  let items = sale.items_json;
  if (typeof items === 'string') { try { items = JSON.parse(items); } catch { items = []; } }
  items = Array.isArray(items) ? items : [];
  let baixados = 0;
  for (const it of items) {
    const pid = String(it.product_id || '');
    const qty = Math.max(1, Number(it.qty) || 1);
    if (!pid) continue;
    const siArr = await (await sb(`store_inventory?select=id,quantity&owner_id=eq.${encodeURIComponent(sale.seller_id)}&product_id=eq.${encodeURIComponent(pid)}&limit=1`)).json();
    const si = Array.isArray(siArr) ? siArr[0] : null;
    if (!si) continue;
    const newQty = Math.max(0, (Number(si.quantity) || 0) - qty);
    await sb(`store_inventory?id=eq.${encodeURIComponent(si.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ quantity: newQty, active: newQty > 0, updated_at: now }) });
    baixados++;
  }
  const commission = await payStoreCommissions(sale);
  await sb(`catalog_sales?id=eq.${sale.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_total: commission, fulfillment_status: 'a_enviar' }) });
  return { loja: true, baixados, commission };
}
