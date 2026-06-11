// saveProductPricing — salva os preços calculados nos produtos (service_role, anon não persiste).
// Atualiza selling_price_retail + price_catalog (preço da loja) + market_value.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) return res.status(400).json({ success: false, error: 'items obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const now = new Date().toISOString();
    let saved = 0;
    for (const it of items) {
      const id = String(it.id || '').trim();
      const selling = round2(it.selling_price_retail);
      if (!id || !(selling > 0)) continue;
      const patch = { selling_price_retail: selling, price_catalog: selling, updated_date: now };
      if (it.market_price != null) patch.market_value = round2(it.market_price);
      if (it.source_url) patch.source_url = it.source_url;
      const r = await sb(`products?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
      if (r.ok) saved++;
    }
    return res.status(200).json({ success: saved > 0, saved, total: items.length });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao salvar preços', details: String(e?.message || e) });
  }
}
