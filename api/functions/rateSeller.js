// rateSeller — cliente avalia o lojista/vendedor com estrelas (1-5) a partir de um pedido.
// Valida que o pedido existe e é DO comprador (não dá pra avaliar sem ter comprado).
// Uma avaliação por pedido (upsert por sale_id). Persiste via service_role.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const buyerId = String(body?.buyer_id || '').trim();
    const saleId = String(body?.sale_id || '').trim();
    const stars = parseInt(body?.stars, 10);
    const comment = (body?.comment ? String(body.comment) : '').slice(0, 500) || null;
    if (!buyerId || !saleId) return res.status(400).json({ success: false, error: 'Pedido e usuário obrigatórios' });
    if (!(stars >= 1 && stars <= 5)) return res.status(400).json({ success: false, error: 'Dê de 1 a 5 estrelas' });

    // confirma que o pedido é do comprador e pega o vendedor
    const saleArr = await (await sb(`catalog_sales?select=id,buyer_id,seller_id,status&id=eq.${encodeURIComponent(saleId)}&limit=1`)).json();
    const sale = Array.isArray(saleArr) ? saleArr[0] : null;
    if (!sale) return res.status(200).json({ success: false, error: 'Pedido não encontrado' });
    if (sale.buyer_id && buyerId && sale.buyer_id !== buyerId) return res.status(200).json({ success: false, error: 'Esse pedido não é seu' });
    if (!sale.seller_id) return res.status(200).json({ success: false, error: 'Pedido sem vendedor' });

    const buyerArr = await (await sb(`app_users?select=full_name&id=eq.${encodeURIComponent(buyerId)}&limit=1`)).json();
    const buyerName = Array.isArray(buyerArr) ? (buyerArr[0]?.full_name || null) : null;

    // upsert por sale_id (resolve conflito no índice único)
    const r = await sb('seller_ratings?on_conflict=sale_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ seller_id: sale.seller_id, buyer_id: buyerId, buyer_name: buyerName, sale_id: saleId, stars, comment, updated_at: new Date().toISOString() }),
    });
    if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: 'Falha ao salvar', details: t.slice(0, 200) }); }

    // devolve o novo resumo da loja
    const sum = await (await sb(`rpc/avaliacao_loja`, { method: 'POST', body: JSON.stringify({ _seller: sale.seller_id }) })).json();
    return res.status(200).json({ success: true, seller_id: sale.seller_id, stars, resumo: sum });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
