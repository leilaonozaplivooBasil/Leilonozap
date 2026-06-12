// createPdvOrder — tirador de pedido (PDV) do Distribuidor: grava venda física em catalog_sales
// e baixa o estoque (products). service_role. Guard: ator admin/super_admin OU cargo de estoque.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
import { payDirectCommissions } from '../_lib/commissions.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const STOCK_CARGOS = ['distribuidor', 'loja_fisica', 'ponto_retirada'];

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
    const actorId = String(body?.actorId || '').trim();
    const items = Array.isArray(body?.items) ? body.items : [];
    const customer = body?.customer || {};
    const paymentMethod = String(body?.payment_method || 'dinheiro');
    const delivered = !!body?.delivered; // retirada no balcão = entregue na hora
    const vendedorId = String(body?.vendedor_id || '').trim(); // venda vinculada a um vendedor (comissão)
    if (!actorId || !items.length) return res.status(400).json({ success: false, error: 'Operador e itens são obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // guard: ator admin OU cargo de estoque OU funcionário de PDV ativo
    const actorArr = await (await sb(`app_users?select=id,full_name,role,career_levels,primary_career_level,is_pdv_operator,employer_id,active&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    if (!actor) return res.status(403).json({ success: false, error: 'Operador inválido' });
    const isAdmin = ['admin', 'super_admin'].includes(actor.role);
    const hasStock = Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK_CARGOS.includes(c));
    const isEmployee = actor.is_pdv_operator === true && actor.active !== false;
    if (!isAdmin && !hasStock && !isEmployee) return res.status(403).json({ success: false, error: 'Sem permissão para tirar pedido' });
    const employerId = isEmployee ? (actor.employer_id || null) : null;
    // dono de loja (loja_fisica/ponto/parceiro) vende do PRÓPRIO store_inventory
    const isStoreOwner = ['loja_fisica', 'ponto_retirada', 'parceiro'].includes(actor.primary_career_level);

    // lê produtos (preço de referência + estoque + dono)
    const ids = items.map((i) => String(i.product_id)).filter(Boolean);
    if (!ids.length) return res.status(400).json({ success: false, error: 'Itens inválidos' });
    const inList = ids.map((i) => `"${encodeURIComponent(i)}"`).join(',');
    const prods = await (await sb(`products?select=id,description,price_catalog,selling_price_retail,quantity,quantity_sold,sold_amount,distribuidor_id&id=in.(${inList})`)).json();
    const pmap = {}; (Array.isArray(prods) ? prods : []).forEach((p) => { pmap[p.id] = p; });

    // estoque da loja (quando for dono de loja)
    const siMap = {};
    if (isStoreOwner) {
      const si = await (await sb(`store_inventory?select=id,product_id,quantity,price&owner_id=eq.${encodeURIComponent(actorId)}&product_id=in.(${inList})`)).json();
      (Array.isArray(si) ? si : []).forEach((s) => { siMap[s.product_id] = s; });
    }

    let total = 0, totalQty = 0; const lines = []; let sellerId = null;
    for (const it of items) {
      const p = pmap[String(it.product_id)];
      if (!p) continue;
      const qty = Math.max(1, Number(it.quantity) || 1);
      if (isStoreOwner) {
        const si = siMap[String(it.product_id)];
        if (!si) return res.status(200).json({ success: false, error: `"${(p.description || '').slice(0, 40)}" não está na sua loja.` });
        if ((Number(si.quantity) || 0) < qty) return res.status(200).json({ success: false, error: `Estoque insuficiente de "${(p.description || '').slice(0, 40)}" (tem ${Number(si.quantity) || 0}).` });
        const unit = it.price != null && it.price !== '' ? round2(it.price) : round2(si.price || p.price_catalog || 0);
        total += unit * qty; totalQty += qty;
        lines.push({ p, qty, unit, si });
      } else {
        const unit = it.price != null && it.price !== '' ? round2(it.price) : round2(p.price_catalog || p.selling_price_retail || 0);
        total += unit * qty; totalQty += qty;
        sellerId = sellerId || p.distribuidor_id || null;
        lines.push({ p, qty, unit });
      }
    }
    if (!lines.length) return res.status(400).json({ success: false, error: 'Nenhum produto válido' });
    total = round2(total);
    sellerId = isStoreOwner ? actorId : (sellerId || employerId || actorId);

    // 🧑‍💼 venda vinculada a um vendedor da rede → a venda passa a ser DELE (e ele ganha comissão)
    let vendedor = null;
    if (vendedorId && !isStoreOwner) {
      const vArr = await (await sb(`app_users?select=id,full_name,primary_career_level&id=eq.${encodeURIComponent(vendedorId)}&limit=1`)).json();
      vendedor = Array.isArray(vArr) ? vArr[0] : null;
      if (vendedor) sellerId = vendedor.id;
    }

    const now = new Date().toISOString();
    const saleId = oid();
    const title = lines.length === 1 ? lines[0].p.description : `${lines[0].p.description} +${lines.length - 1} item(ns)`;
    const itemsJson = lines.map((ln) => ({ product_id: ln.p.id, title: String(ln.p.description || '').slice(0, 200), qty: ln.qty, unit: ln.unit }));
    const sale = {
      id: saleId, base44_id: saleId, kind: 'produto', source: 'pdv',
      seller_id: sellerId, operator_id: actorId,
      buyer_name: customer.name || 'Cliente balcão', buyer_email: customer.email || null, buyer_phone: customer.phone || null,
      product_title: String(title).slice(0, 300), sale_price: total, total_amount: total, quantity: totalQty,
      items_json: itemsJson,
      status: delivered ? 'entregue' : 'paid', payment_method: paymentMethod,
      ...(delivered ? { delivered_at: now } : {}),
    };
    // insere a venda (tenta com campos extras; se coluna não existir, cai pro mínimo)
    let r = await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(sale) });
    if (!r.ok) {
      const minimal = { id: saleId, base44_id: saleId, kind: 'produto', seller_id: sellerId, buyer_name: sale.buyer_name, product_title: sale.product_title, sale_price: total, total_amount: total, quantity: totalQty, status: sale.status, payment_method: paymentMethod };
      r = await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(minimal) });
      if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: 'Falha ao gravar venda', details: t.slice(0, 200) }); }
    }

    // baixa estoque de cada item (loja → store_inventory; distribuidor → products). qty=0 → inativo.
    for (const ln of lines) {
      if (isStoreOwner && ln.si) {
        const newQty = Math.max(0, (Number(ln.si.quantity) || 0) - ln.qty);
        await sb(`store_inventory?id=eq.${encodeURIComponent(ln.si.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ quantity: newQty, active: newQty > 0, updated_at: now }) });
      } else {
        const p = ln.p;
        const newQty = Math.max(0, (Number(p.quantity) || 0) - ln.qty);
        const newSold = (Number(p.quantity_sold) || 0) + ln.qty;
        const newSoldAmount = round2((Number(p.sold_amount) || 0) + ln.unit * ln.qty);
        await sb(`products?id=eq.${encodeURIComponent(p.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ quantity: newQty, quantity_sold: newSold, sold_amount: newSoldAmount, status: newQty > 0 ? 'ESTOQUE' : 'VENDIDO', updated_date: now }) });
      }
    }

    // comissão: só quando a venda foi vinculada a um vendedor da rede
    let comissao = 0;
    if (vendedor) {
      comissao = await payDirectCommissions({ saleId, sellerId: vendedor.id, total });
      if (comissao > 0) await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_total: comissao }) });
    }

    return res.status(200).json({ success: true, sale_id: saleId, total, items: lines.length, status: sale.status, vendedor: vendedor?.full_name || null, comissao });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao tirar pedido', details: String(e?.message || e) });
  }
}
