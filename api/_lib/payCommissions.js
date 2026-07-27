// Helper compartilhado (pasta _lib é ignorada como rota pela Vercel): distribui a comissão
// de uma venda de CATÁLOGO pela cadeia do COMPRADOR (telescópio, teto 20%) — mesma lógica do
// mpWebhook. Usado também pelo pagar-com-saldo, pra a venda com saldo pagar comissão igual a uma PIX.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export async function payCommissions(sale) {
  const value = Number(sale.total_amount) || 0;
  if (!value || !sale.buyer_id) return 0;
  const levels = Object.fromEntries((await (await sb('career_levels?select=id,venda_direta_pct')).json()).map((l) => [l.id, l]));
  const ovRows = await (await sb('commission_overrides?select=earner_level,on_level,pct&condicao=eq.direto')).json();
  const ov = {}; (Array.isArray(ovRows) ? ovRows : []).forEach((r) => { (ov[r.earner_level] = ov[r.earner_level] || {})[r.on_level] = r.pct; });

  // carrega a cadeia (até 10 níveis acima do comprador)
  const chain = [];
  let cur = await (await sb(`app_users?select=id,full_name,primary_career_level,referred_by_id&id=eq.${encodeURIComponent(sale.buyer_id)}&limit=1`)).json();
  let node = Array.isArray(cur) ? cur[0] : null;
  for (let i = 0; i < 10 && node && node.referred_by_id; i++) {
    const a = await (await sb(`app_users?select=id,full_name,primary_career_level,referred_by_id,commission_balance&id=eq.${encodeURIComponent(node.referred_by_id)}&limit=1`)).json();
    const anc = Array.isArray(a) ? a[0] : null;
    if (!anc) break;
    chain.push({ child: node, anc });
    node = anc;
  }

  const cap = 0.20 * value; let running = 0; let total = 0;
  for (let i = 0; i < chain.length && running < cap - 0.001; i++) {
    const { child, anc } = chain[i];
    const pct = i === 0 ? (levels[anc.primary_career_level]?.venda_direta_pct || 0) : ((ov[anc.primary_career_level] || {})[child.primary_career_level] || 0);
    let amount = round2(value * pct / 100);
    if (running + amount > cap) amount = round2(cap - running);
    if (amount > 0.001) {
      await sb('commission_ledger', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
        sale_id: sale.id, beneficiary_id: anc.id, beneficiary_name: anc.full_name, beneficiary_level: anc.primary_career_level,
        role_in_sale: i === 0 ? 'venda_direta' : 'override', pct, amount,
      }) });
      await sb(`app_users?id=eq.${anc.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_balance: round2((Number(anc.commission_balance) || 0) + amount) }) });
      running += amount; total += amount;
    }
  }
  return round2(total);
}
