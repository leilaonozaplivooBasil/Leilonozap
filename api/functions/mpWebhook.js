// mpWebhook — recebe notificação do Mercado Pago, CONFIRMA o pagamento buscando-o na API do MP
// (não confia no corpo), marca a venda como paga e PAGA as comissões pela cadeia (telescópio, teto 20%).
// Idempotente: se a venda já está paga, não repaga.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const round2 = (n) => Math.round(n * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

async function payCommissions(sale) {
  const value = Number(sale.total_amount) || 0;
  if (!value || !sale.buyer_id) return 0;
  const levels = Object.fromEntries((await (await sb('career_levels?select=id,venda_direta_pct')).json()).map((l) => [l.id, l]));
  const ovRows = await (await sb('commission_overrides?select=earner_level,on_level,pct&condicao=eq.direto')).json();
  const ov = {}; ovRows.forEach((r) => { (ov[r.earner_level] = ov[r.earner_level] || {})[r.on_level] = r.pct; });

  // carrega a cadeia (até 10 níveis acima)
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

export default async function handler(req, res) {
  try {
    if (!SUPABASE_URL || !SR || !MP_TOKEN) return res.status(200).json({ ok: false, error: 'config' });
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    // o id do pagamento vem em data.id (body) ou ?data.id / ?id (query)
    const url = new URL(req.url, 'http://x');
    const payId = body?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id') || body?.id;
    if (!payId) return res.status(200).json({ ok: true, ignored: true });

    // BUSCA o pagamento real no MP (fonte de verdade — não confia no corpo do webhook)
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${payId}`, { headers: { Authorization: `Bearer ${MP_TOKEN}` } });
    const pay = await r.json();
    if (!r.ok || !pay?.id) return res.status(200).json({ ok: true, notfound: true });

    if (pay.status !== 'approved') return res.status(200).json({ ok: true, status: pay.status });

    const saleId = pay.external_reference;
    const rows = await (await sb(`catalog_sales?select=*&or=(id.eq.${saleId},mp_payment_id.eq.${pay.id})&limit=1`)).json();
    const sale = Array.isArray(rows) ? rows[0] : null;
    if (!sale) return res.status(200).json({ ok: true, sale_notfound: true });
    if (sale.status === 'paid') return res.status(200).json({ ok: true, already_paid: true }); // idempotência

    await sb(`catalog_sales?id=eq.${sale.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'paid', mp_payment_id: String(pay.id) }) });
    const commission = await payCommissions(sale);
    await sb(`catalog_sales?id=eq.${sale.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_total: commission }) });

    return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, commission });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
}
