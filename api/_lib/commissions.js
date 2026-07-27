// Helper (pasta _lib, ignorada pela Vercel como rota): paga comissão DIRETA de uma venda
// começando no vendedor (ele ganha a venda_direta_pct do cargo dele) e subindo a cadeia
// (override telescópico, teto 20% do valor). Best-effort: erro aqui não derruba a venda.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export async function payDirectCommissions({ saleId, sellerId, total }) {
  const value = Number(total) || 0;
  if (!value || !sellerId) return 0;
  try {
    const levels = Object.fromEntries((await (await sb('career_levels?select=id,venda_direta_pct')).json()).map((l) => [l.id, l]));
    const ovRows = await (await sb('commission_overrides?select=earner_level,on_level,pct&condicao=eq.direto')).json();
    const ov = {}; (Array.isArray(ovRows) ? ovRows : []).forEach((r) => { (ov[r.earner_level] = ov[r.earner_level] || {})[r.on_level] = r.pct; });

    // cadeia: [vendedor, upline1, upline2, ...]
    const chain = [];
    let node = (await (await sb(`app_users?select=id,full_name,primary_career_level,referred_by_id,commission_balance&id=eq.${encodeURIComponent(sellerId)}&limit=1`)).json())?.[0];
    while (node && chain.length < 11) {
      chain.push(node);
      if (!node.referred_by_id) break;
      node = (await (await sb(`app_users?select=id,full_name,primary_career_level,referred_by_id,commission_balance&id=eq.${encodeURIComponent(node.referred_by_id)}&limit=1`)).json())?.[0];
    }

    // CÚPULA (sócio/fundador/CEO): SEMPRE 20% na venda direta das lojas deles
    const CUPULA = ['fundador', 'ceo', 'socio'];
    const cap = 0.20 * value; let running = 0; let total_pago = 0;
    for (let i = 0; i < chain.length && running < cap - 0.001; i++) {
      const earner = chain[i];
      const child = i === 0 ? null : chain[i - 1];
      const pct = i === 0
        ? (CUPULA.includes(earner.primary_career_level) ? 20 : Number(levels[earner.primary_career_level]?.venda_direta_pct || 0))
        : Number((ov[earner.primary_career_level] || {})[child.primary_career_level] || 0);
      let amount = round2(value * pct / 100);
      if (running + amount > cap) amount = round2(cap - running);
      if (amount > 0.001) {
        await sb('commission_ledger', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
          sale_id: saleId, beneficiary_id: earner.id, beneficiary_name: earner.full_name, beneficiary_level: earner.primary_career_level,
          role_in_sale: i === 0 ? 'venda_pdv' : 'override', pct, amount,
        }) });
        await sb(`app_users?id=eq.${earner.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_balance: round2((Number(earner.commission_balance) || 0) + amount) }) });
        running += amount; total_pago += amount;
      }
    }
    return round2(total_pago);
  } catch { return 0; }
}
