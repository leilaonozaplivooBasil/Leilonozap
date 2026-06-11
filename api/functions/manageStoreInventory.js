// manageStoreInventory — estoque da loja (store_inventory). action: setQuantity|toggle|remove|add.
// Regras: o DONO mexe no próprio estoque (ou admin). add/remove (editar catálogo) = só loja_fisica.
// setQuantity = qualquer dono (campo de quantidade pra não dar erro na venda). qty=0 → inativo.
import crypto from 'crypto';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const oid = () => crypto.randomBytes(12).toString('hex');

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const actorId = String(body?.actorId || '').trim();
    const action = String(body?.action || '');
    if (!actorId || !['setQuantity', 'toggle', 'remove', 'add'].includes(action)) return res.status(400).json({ success: false, error: 'Parâmetros inválidos' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const actorArr = await (await sb(`app_users?select=id,role,primary_career_level,career_levels&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    if (!actor) return res.status(403).json({ success: false, error: 'Operador inválido' });
    const isAdmin = ['admin', 'super_admin'].includes(actor.role);
    const isLojaFisica = (Array.isArray(actor.career_levels) && actor.career_levels.includes('loja_fisica')) || actor.primary_career_level === 'loja_fisica';
    const now = new Date().toISOString();

    // resolve o item e o dono
    let inv = null;
    if (body?.inv_id) {
      const rows = await (await sb(`store_inventory?select=id,owner_id,product_id&id=eq.${encodeURIComponent(String(body.inv_id))}&limit=1`)).json();
      inv = Array.isArray(rows) ? rows[0] : null;
    }
    const ownerId = inv?.owner_id || String(body?.owner_id || '').trim();
    if (!ownerId) return res.status(400).json({ success: false, error: 'Loja não identificada' });
    if (!isAdmin && ownerId !== actorId) return res.status(403).json({ success: false, error: 'Você só mexe no seu próprio estoque' });

    if (action === 'setQuantity') {
      if (!inv) return res.status(400).json({ success: false, error: 'inv_id obrigatório' });
      const qty = Math.max(0, Number(body?.quantity) || 0);
      await sb(`store_inventory?id=eq.${encodeURIComponent(inv.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ quantity: qty, active: qty > 0, updated_at: now }) });
      return res.status(200).json({ success: true, quantity: qty, active: qty > 0 });
    }

    if (action === 'toggle') {
      if (!inv) return res.status(400).json({ success: false, error: 'inv_id obrigatório' });
      const active = !!body?.active;
      await sb(`store_inventory?id=eq.${encodeURIComponent(inv.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ active, updated_at: now }) });
      return res.status(200).json({ success: true, active });
    }

    // add/remove = editar catálogo → só loja_fisica (ou admin)
    if (!isAdmin && !isLojaFisica) return res.status(403).json({ success: false, error: 'Só Loja Física edita o catálogo' });

    if (action === 'remove') {
      if (!inv) return res.status(400).json({ success: false, error: 'inv_id obrigatório' });
      await sb(`store_inventory?id=eq.${encodeURIComponent(inv.id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return res.status(200).json({ success: true });
    }

    if (action === 'add') {
      const productId = String(body?.product_id || '').trim();
      const qty = Math.max(0, Number(body?.quantity) || 0);
      if (!productId) return res.status(400).json({ success: false, error: 'product_id obrigatório' });
      // pega preço do produto pra herdar
      const prod = await (await sb(`products?select=price_catalog&id=eq.${encodeURIComponent(productId)}&limit=1`)).json();
      const price = Array.isArray(prod) && prod[0] ? prod[0].price_catalog : null;
      const payload = { id: oid(), owner_id: ownerId, product_id: productId, quantity: qty, active: qty > 0, price };
      const r = await sb('store_inventory', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(payload) });
      const rows = await r.json();
      if (!r.ok) return res.status(200).json({ success: false, error: 'Falha ao solicitar', details: JSON.stringify(rows).slice(0, 200) });
      return res.status(200).json({ success: true, item: Array.isArray(rows) ? rows[0] : rows });
    }

    return res.status(400).json({ success: false, error: 'Ação inválida' });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
