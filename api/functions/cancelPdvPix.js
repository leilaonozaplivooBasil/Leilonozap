// cancelPdvPix — o cliente desistiu / não pagou no balcão: cancela o pedido PIX do PDV.
// Segurança: SÓ cancela venda de origem 'pdv' que ainda está 'pending_payment' —
// nunca toca em venda paga (o PATCH condicional no banco garante isso atomicamente).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const saleId = String(body?.sale_id || '').trim();
    if (!saleId) return res.status(400).json({ success: false, error: 'sale_id obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const r = await fetch(`${SUPABASE_URL}/rest/v1/catalog_sales?id=eq.${encodeURIComponent(saleId)}&status=eq.pending_payment&source=eq.pdv`, {
      method: 'PATCH',
      headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'canceled' }),
    });
    const rows = await r.json().catch(() => []);
    return res.status(200).json({ success: true, canceled: Array.isArray(rows) && rows.length > 0 });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}