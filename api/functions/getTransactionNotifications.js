// getTransactionNotifications — eventos de transação do usuário para os popups em tela.
// Retorna as últimas transações PAGAS onde o usuário é comprador (compra confirmada),
// vendedor/licenciado (venda realizada) ou beneficiário de comissão (comissão recebida).
// O cliente deduplica por id (localStorage) e só exibe o que ainda não viu.
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
    if (!userId) return res.status(400).json({ success: false, error: 'Usuário obrigatório', events: [] });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente', events: [] });

    const uid = encodeURIComponent(userId);
    const saleSelect = 'id,product_title,product_image,total_amount,sale_price,buyer_id,buyer_name,seller_id,created_date';
    const [buysR, sellsR, commsR] = await Promise.all([
      sb(`catalog_sales?select=${saleSelect}&buyer_id=eq.${uid}&status=eq.paid&order=created_date.desc&limit=10`),
      sb(`catalog_sales?select=${saleSelect}&seller_id=eq.${uid}&status=eq.paid&order=created_date.desc&limit=10`),
      sb(`commission_ledger?select=created_at,amount,pct,role_in_sale&beneficiary_id=eq.${uid}&order=created_at.desc&limit=10`),
    ]);
    const buys = await buysR.json();
    const sells = await sellsR.json();
    const comms = await commsR.json();

    const events = [];
    for (const s of Array.isArray(buys) ? buys : []) {
      events.push({
        id: `buy-${s.id}`, type: 'purchase',
        title: 'Compra confirmada',
        product: s.product_title || 'Pedido', image: s.product_image || null,
        amount: Number(s.total_amount) || Number(s.sale_price) || 0,
        date: s.created_date,
      });
    }
    for (const s of Array.isArray(sells) ? sells : []) {
      if (s.buyer_id === userId) continue; // não notifica venda de si mesmo
      events.push({
        id: `sell-${s.id}`, type: 'sale',
        title: 'Venda realizada',
        product: s.product_title || 'Produto', image: s.product_image || null,
        buyer: s.buyer_name || null,
        amount: Number(s.total_amount) || Number(s.sale_price) || 0,
        date: s.created_date,
      });
    }
    for (const c of Array.isArray(comms) ? comms : []) {
      events.push({
        id: `comm-${c.created_at}-${c.amount}`, type: 'commission',
        title: 'Comissão recebida',
        product: c.pct ? `${c.pct}% de comissão` : 'Comissão da rede', image: null,
        amount: Number(c.amount) || 0,
        date: c.created_at,
      });
    }

    events.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return res.status(200).json({ success: true, events: events.slice(0, 20) });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e), events: [] });
  }
}
