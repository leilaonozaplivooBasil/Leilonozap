// productAdminAction — operações de produto (service_role): update | zerarEstoque | delete | setField.
// Guard: ator admin/super_admin OU cargo de estoque (distribuidor/loja_fisica/ponto_retirada).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STOCK = ['distribuidor', 'loja_fisica', 'ponto_retirada'];
const ALLOWED = ['description', 'quantity', 'cost_price', 'selling_price_retail', 'selling_price_wholesale',
  'price_catalog', 'market_value', 'status', 'qty_perfeito', 'qty_bom', 'qty_oficina', 'qty_ruim',
  'sold_amount', 'deposit_name', 'lot', 'notes', 'catalog_active', 'is_featured', 'profit',
  'linked_auctions', 'image_urls', 'source_url', 'date', 'purchase_order'];

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const action = String(body?.action || '');
    const actorId = String(body?.actorId || '').trim();
    const productId = String(body?.productId || '').trim();
    if (!actorId || !productId || !action) return res.status(400).json({ success: false, error: 'actorId, productId e action obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    // guard
    const actorArr = await (await sb(`app_users?select=id,role,career_levels&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    const ok = actor && (['admin', 'super_admin'].includes(actor.role) || (Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK.includes(c))));
    if (!ok) return res.status(403).json({ success: false, error: 'Sem permissão' });

    const now = new Date().toISOString();

    if (action === 'delete') {
      const r = await sb(`products?id=eq.${encodeURIComponent(productId)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: 'Falha ao excluir', details: t.slice(0, 200) }); }
      return res.status(200).json({ success: true, action: 'delete' });
    }

    let patch = {};
    if (action === 'zerarEstoque') {
      patch = { quantity: 0, qty_perfeito: 0, qty_bom: 0, qty_oficina: 0, qty_ruim: 0, updated_date: now };
    } else if (action === 'update' || action === 'setField') {
      const fields = body?.fields || {};
      for (const k of Object.keys(fields)) { if (ALLOWED.includes(k)) patch[k] = fields[k]; }
      patch.updated_date = now;
      if (Object.keys(patch).length <= 1) return res.status(400).json({ success: false, error: 'Nenhum campo válido pra atualizar' });
    } else {
      return res.status(400).json({ success: false, error: 'Ação inválida' });
    }

    const r = await sb(`products?id=eq.${encodeURIComponent(productId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
    if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: 'Falha ao atualizar', details: t.slice(0, 200) }); }

    // log best-effort (não bloqueia)
    if (action === 'zerarEstoque' && (body?.operator_name || body?.reason)) {
      try { await sb('stock_operations', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ product_id: productId, operation_type: 'zerar_estoque', operator_name: body.operator_name || null, reason: body.reason || null, operation_date: now, actor_id: actorId }) }); } catch (_) { /* tabela pode não existir */ }
    }
    return res.status(200).json({ success: true, action });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
