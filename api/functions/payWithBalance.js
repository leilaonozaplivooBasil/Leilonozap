// payWithBalance — compra paga com o saldo de comissão (commission_balance) do próprio usuário.
// Para vendedores/lojistas redimirem comissão em produtos da plataforma.
// Toda a validação (preço, estoque, saldo) e a baixa acontecem ATÔMICAS na função SQL comprar_com_saldo.
import { fulfillStoreOrder } from '../_lib/storeFulfill.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
function rpc(fn, args) {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const buyerId = String(body?.buyer_id || '').trim();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!buyerId) return res.status(400).json({ success: false, error: 'Usuário obrigatório' });
    if (!items.length) return res.status(400).json({ success: false, error: 'Carrinho vazio' });

    // normaliza itens -> [{product_id, qty}]
    const cleanItems = items
      .map((it) => ({ product_id: String(it.product_id || it.id || '').trim(), qty: Math.max(1, parseInt(it.quantity || it.qty || 1, 10) || 1) }))
      .filter((it) => it.product_id);
    if (!cleanItems.length) return res.status(400).json({ success: false, error: 'Itens inválidos' });

    // resolve o seller (loja) pra atribuição/envio: prioridade ref_code do link, senão o RPC decide
    let sellerId = body?.seller_id ? String(body.seller_id) : null;
    const refCode = String(body?.ref_code || '').trim();
    if (!sellerId && refCode) {
      const r = await (await sb(`app_users?select=id&referral_code=eq.${encodeURIComponent(refCode)}&limit=1`)).json();
      if (Array.isArray(r) && r[0]) sellerId = r[0].id;
    }

    const r = await rpc('comprar_com_saldo', {
      _buyer: buyerId,
      _items: cleanItems,
      _seller: sellerId,
      _buyer_name: body?.buyer_name || null,
      _buyer_phone: body?.buyer_phone ? String(body.buyer_phone).replace(/\D/g, '') : null,
      _address: body?.buyer_address || null,
      _cep: body?.buyer_cep ? String(body.buyer_cep).replace(/\D/g, '') : null,
      _coupon: body?.coupon_code ? String(body.coupon_code) : null,
    });
    const out = await r.json();
    const data = Array.isArray(out) ? out[0] : out; // rpc retorna o json direto

    if (!data || data.ok !== true) {
      return res.status(200).json({ success: false, error: data?.error || 'Não foi possível concluir', saldo: data?.saldo, total: data?.total });
    }

    // conclui como venda de loja: comissão pro DONO da loja (modelo marketplace) + fulfillment.
    // Mesma rota de uma venda PIX paga (kind='loja' → fulfillStoreOrder no webhook).
    let commission = 0;
    try {
      const saleArr = await (await sb(`catalog_sales?select=*&id=eq.${encodeURIComponent(data.sale_id)}&limit=1`)).json();
      const sale = Array.isArray(saleArr) ? saleArr[0] : null;
      if (sale && !Number(sale.commission_total)) {
        const r = await fulfillStoreOrder(sale);
        commission = r?.commission || 0;
      }
    } catch (e) { console.error('fulfillStoreOrder (saldo) falhou:', e?.message || e); }

    return res.status(200).json({ success: true, sale_id: data.sale_id, total: data.total, novo_saldo: data.novo_saldo, tracking: data.tracking, commission });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
