// syncStoreProduct — propaga alterações de um produto para o estoque das lojas (store_inventory),
// que é a tabela que a vitrine /loja/:slug realmente lê. Resolve:
//   • BUG "editei o preço no admin e não mudou na loja": store_inventory.price era um snapshot
//     congelado (só gravado no 'add'). Aqui atualizamos price em TODAS as lojas que têm o produto.
//   • "Retirar da loja" sem apagar da gestão: seta active=false no store_inventory do produto.
// Guard: admin/super_admin ou cargo de estoque. service_role (anon não persiste).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STOCK = ['distribuidor', 'loja_fisica', 'ponto_retirada'];
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const productId = String(body?.product_id || '').trim();
    const actorId = String(body?.actor_id || body?.actorId || '').trim();
    if (!productId) return res.status(400).json({ success: false, error: 'product_id obrigatório' });
    if (!actorId) return res.status(403).json({ success: false, error: 'Sem credencial' });

    const a = await (await sb(`app_users?select=id,role,career_levels&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(a) ? a[0] : null;
    const ok = actor && (['admin', 'super_admin'].includes(actor.role) || (Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK.includes(c))));
    if (!ok) return res.status(403).json({ success: false, error: 'Sem permissão' });

    const patch = { updated_at: new Date().toISOString() };
    if (body?.price != null && Number(body.price) > 0) patch.price = round2(body.price);
    if (typeof body?.active === 'boolean') patch.active = body.active;
    if (Object.keys(patch).length === 1) return res.status(400).json({ success: false, error: 'Nada para atualizar (price ou active)' });

    const r = await sb(`store_inventory?product_id=eq.${encodeURIComponent(productId)}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch),
    });
    const rows = await r.json().catch(() => null);
    if (!r.ok) return res.status(200).json({ success: false, error: 'Falha ao sincronizar loja', details: JSON.stringify(rows).slice(0, 200) });
    return res.status(200).json({ success: true, updated: Array.isArray(rows) ? rows.length : 0 });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
