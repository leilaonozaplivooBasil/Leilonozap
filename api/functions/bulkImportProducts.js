// bulkImportProducts — importa produtos em massa (planilha) pra Loja Virtual (service_role).
// Guard: ator admin/super_admin. Já publica na loja (catalog_active=true).
import crypto from 'crypto';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const oid = () => crypto.randomBytes(12).toString('hex');
const num = (v) => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
};

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
    const publish = body?.publish !== false;
    if (!actorId) return res.status(400).json({ success: false, error: 'actorId obrigatório' });
    if (!items.length) return res.status(400).json({ success: false, error: 'Nenhum produto na planilha' });
    if (items.length > 2000) return res.status(400).json({ success: false, error: 'Limite de 2000 por importação' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // guard admin
    const actorArr = await (await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    if (!actor || !['admin', 'super_admin'].includes(actor.role)) {
      return res.status(403).json({ success: false, error: 'Sem permissão (ator não é admin)' });
    }

    const now = new Date().toISOString();
    const rows = [];
    for (const it of items) {
      const name = String(it.name || it.description || '').trim();
      if (!name) continue;
      const price = num(it.price);
      const cost = num(it.cost);
      const compare = num(it.compare);
      const qty = num(it.quantity);
      const images = Array.isArray(it.images) ? it.images : (it.images ? String(it.images).split(/[;\n,]/).map((s) => s.trim()).filter(Boolean) : []);
      const id = oid();
      rows.push({
        id, base44_id: id,
        description: name.slice(0, 500),
        price_catalog: price,
        selling_price_retail: price,
        cost_price: cost,
        market_value: compare,
        quantity: qty != null ? qty : 1,
        lot: it.sku ? String(it.sku) : null,
        image_urls: images,
        notes: it.notes ? String(it.notes).slice(0, 2000) : null,
        catalog_active: !!publish,
        status: 'ESTOQUE',
        is_featured: false,
        created_date: now, updated_date: now,
      });
    }
    if (!rows.length) return res.status(200).json({ success: false, error: 'Nenhuma linha válida (faltou nome/produto).' });

    // insere em lotes de 200
    let inserted = 0; const errors = [];
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const r = await sb('products', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(chunk) });
      if (r.ok) inserted += chunk.length;
      else { const t = await r.text(); errors.push(t.slice(0, 200)); }
    }
    return res.status(200).json({ success: inserted > 0, inserted, total: rows.length, errors: errors.slice(0, 3) });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao importar', details: String(e?.message || e) });
  }
}
