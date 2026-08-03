// finalizeSellerOrder — fecha o pedido da Etapa 2 do "Seja Vendedor" (escolha de produtos
// usando o saldo da adesão já paga). Escrita direta do navegador em catalog_sales/app_users
// é bloqueada por RLS (usuário custom, sem sessão Supabase real) — por isso passa por aqui
// com service role, no mesmo padrão de createSellerAdhesionPayment.js / payAdhesionWithTestBalance.js.
import { oid } from '../_lib/oid.js';

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
    const { user_id, items, delivery_method, carrier, address } = body || {};
    if (!SUPABASE_URL || !SR) return res.status(200).json({ success: false, error: 'Banco não configurado' });
    if (!user_id) return res.status(200).json({ success: false, error: 'user_id é obrigatório' });
    if (!Array.isArray(items) || !items.length) return res.status(200).json({ success: false, error: 'Carrinho vazio' });

    const userRows = await (await sb(`app_users?select=id,full_name,email,phone,seller_credit_balance,career_levels,address_street,address_number,address_complement,address_neighborhood,address_city,address_state,address_zip_code&id=eq.${encodeURIComponent(user_id)}&limit=1`)).json();
    const user = Array.isArray(userRows) ? userRows[0] : null;
    if (!user) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });
    const balance = Number(user.seller_credit_balance || 0);
    if (!(balance > 0)) return res.status(200).json({ success: false, error: 'Você não tem saldo de adesão disponível' });

    // 🔒 Recalcula o total no servidor a partir do preço real do produto — não confia no total do cliente.
    const ids = items.map((it) => String(it.product_id)).filter(Boolean);
    const prods = await (await sb(`products?select=id,description,price_catalog,image_urls&id=in.(${ids.map(encodeURIComponent).join(',')})`)).json();
    const byId = Object.fromEntries((Array.isArray(prods) ? prods : []).map((p) => [p.id, p]));

    let total = 0;
    let totalQty = 0;
    const titles = [];
    let firstProduct = null;
    for (const it of items) {
      const p = byId[String(it.product_id)];
      const qty = Math.max(1, Number(it.qty) || 1);
      if (!p) continue;
      total += qty * Number(p.price_catalog || 0);
      totalQty += qty;
      titles.push(p.description);
      if (!firstProduct) firstProduct = p;
    }
    total = Math.round(total * 100) / 100;
    if (!firstProduct || total < balance) {
      return res.status(200).json({ success: false, error: 'O total escolhido precisa atingir seu saldo de adesão' });
    }

    const saleId = oid();
    const isDelivery = delivery_method === 'delivery';
    await sb('catalog_sales', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: saleId, base44_id: saleId,
        product_id: firstProduct.id, product_title: titles.join(', ').slice(0, 250),
        product_image: firstProduct.image_urls?.[0] || null,
        sale_price: total, quantity: totalQty, total_amount: total,
        buyer_id: user.id, buyer_name: user.full_name, buyer_email: user.email, buyer_phone: user.phone,
        licensee_id: 'site_official', licensee_name: 'Sistema — Adesão Vendedor',
        status: 'paid', payment_confirmed_date: new Date().toISOString(),
        carrier: isDelivery ? (carrier || 'A combinar') : 'Retirada na loja',
        ...(isDelivery ? {
          buyer_address: [user.address_street, user.address_number, user.address_complement, user.address_neighborhood, user.address_city, user.address_state].filter(Boolean).join(', '),
          buyer_cep: user.address_zip_code,
        } : {}),
        created_date: new Date().toISOString(),
      }),
    });

    const careerLevels = Array.from(new Set([...(user.career_levels || []), 'vendedor']));
    await sb(`app_users?id=eq.${encodeURIComponent(user_id)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ seller_credit_balance: 0, is_seller: true, career_levels: careerLevels }),
    });

    return res.status(200).json({ success: true, sale_id: saleId, total, career_levels: careerLevels });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao fechar o pedido', details: String(e?.message || e) });
  }
}