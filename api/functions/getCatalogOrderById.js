// getCatalogOrderById — carrega um pedido da loja pra tela "Acompanhar Pedido" (service_role,
// bypassa RLS). A rota NÃO existia: o botão "Acompanhar Pedido" chamava esta função inexistente,
// a página recebia not_implemented, order ficava null e renderizava uma TELA PRETA.
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
    const saleId = String(body?.sale_id || '').trim();
    if (!saleId) return res.status(400).json({ found: false, error: 'sale_id obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ found: false, error: 'Config ausente' });

    // aceita busca por id OU pelo código de rastreio (o que o cliente tem em mãos)
    const rows = await (await sb(
      `catalog_sales?select=id,product_title,product_image,sale_price,total_amount,quantity,status,` +
      `tracking_code,payment_method,buyer_name,buyer_phone,buyer_address,fulfillment_status,` +
      `created_date,created_at,shipped_at,delivered_at,carrier,coupon_code,discount_amount,items_json` +
      `&or=(id.eq.${encodeURIComponent(saleId)},tracking_code.eq.${encodeURIComponent(saleId)})&limit=1`
    )).json();
    const order = Array.isArray(rows) ? rows[0] : null;
    if (!order) return res.status(200).json({ found: false });

    return res.status(200).json({ found: true, order });
  } catch (e) {
    return res.status(200).json({ found: false, error: 'Erro ao carregar pedido', details: String(e?.message || e) });
  }
}
