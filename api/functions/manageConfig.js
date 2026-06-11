// manageConfig — get/set de configs simples (app_config). get público; set admin/super_admin OU cargo estoque.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_KEYS = ['whatsapp_suporte'];

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const action = String(body?.action || 'get');
    const chave = String(body?.chave || '').trim();
    if (!ALLOWED_KEYS.includes(chave)) return res.status(400).json({ success: false, error: 'Chave não permitida' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    if (action === 'get') {
      const rows = await (await sb(`app_config?select=valor&chave=eq.${encodeURIComponent(chave)}&limit=1`)).json();
      return res.status(200).json({ success: true, valor: (Array.isArray(rows) && rows[0]) ? rows[0].valor : '' });
    }

    // set — guard admin/super_admin OU cargo de estoque
    const actorId = String(body?.actorId || '').trim();
    const actorArr = await (await sb(`app_users?select=id,role,career_levels&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    const STOCK = ['distribuidor', 'loja_fisica', 'ponto_retirada'];
    const ok = actor && (['admin', 'super_admin'].includes(actor.role) || (Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK.includes(c))));
    if (!ok) return res.status(403).json({ success: false, error: 'Sem permissão' });

    const valor = String(body?.valor || '');
    await sb('app_config', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ chave, valor, updated_at: new Date().toISOString() }) });
    return res.status(200).json({ success: true, valor });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
