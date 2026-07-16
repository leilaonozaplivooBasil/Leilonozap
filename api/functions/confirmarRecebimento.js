// confirmarRecebimento — o COMPRADOR confirma que recebeu o produto → libera na hora
// o "saldo a liberar" do vendedor (antes do prazo). Usa a RPC confirmar_recebimento,
// que só o service_role pode chamar. Valida que quem confirma é o dono do pedido.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const userId = String(body?.user_id || '').trim();
    const saleId = String(body?.sale_id || '').trim();
    if (!userId || !saleId) return res.status(400).json({ success: false, error: 'Pedido e usuário obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // só o COMPRADOR do pedido pode confirmar o recebimento
    const sale = (await (await sb(`catalog_sales?select=id,buyer_id&id=eq.${encodeURIComponent(saleId)}&limit=1`)).json())[0];
    if (!sale) return res.status(200).json({ success: false, error: 'Pedido não encontrado' });
    if (!sale.buyer_id || sale.buyer_id !== userId) {
      return res.status(200).json({ success: false, error: 'Só o comprador do pedido pode confirmar o recebimento' });
    }

    const r = await sb('rpc/confirmar_recebimento', { method: 'POST', body: JSON.stringify({ _sale_id: saleId }) });
    if (!r.ok) {
      const t = await r.text();
      return res.status(200).json({ success: false, error: 'Falha ao liberar', detail: t.slice(0, 200) });
    }
    const released = await r.json(); // nº de beneficiários liberados (0 se já estava liberado)
    return res.status(200).json({ success: true, released: Number(released) || 0 });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
