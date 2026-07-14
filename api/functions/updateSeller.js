// updateSeller — edita um vendedor da equipe (service_role). Par do registerSeller (que também
// não existia). Só quem cadastrou o vendedor (ou admin) pode editar.
// ⚠️ NÃO mexe em cargo, comissão nem vínculo de rede: só dados cadastrais.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CAMPOS = ['full_name', 'store_name', 'phone', 'cpf', 'avatar_url', 'email'];

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
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const sellerId = String(body?.seller_id || '').trim();
    const actorId = String(body?.actor_id || '').trim();
    if (!sellerId) return res.status(200).json({ success: false, error: 'Vendedor não informado.' });
    if (!actorId) return res.status(200).json({ success: false, error: 'Faça login novamente.' });

    const a = await (await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(a) ? a[0] : null;
    const s = await (await sb(`app_users?select=id,referred_by_id&id=eq.${encodeURIComponent(sellerId)}&limit=1`)).json();
    const seller = Array.isArray(s) ? s[0] : null;
    if (!actor || !seller) return res.status(200).json({ success: false, error: 'Vendedor não encontrado.' });

    const ehAdmin = ['admin', 'super_admin'].includes(actor.role);
    const ehDono = seller.referred_by_id === actor.id;
    if (!ehAdmin && !ehDono) return res.status(200).json({ success: false, error: 'Você só edita os vendedores que cadastrou.' });

    const patch = {};
    for (const k of CAMPOS) {
      if (!(k in body)) continue;
      let v = body[k];
      if (k === 'phone' || k === 'cpf') v = String(v || '').replace(/\D/g, '') || null;
      if (k === 'email') v = String(v || '').trim().toLowerCase() || null;
      patch[k] = v;
    }
    if (!Object.keys(patch).length) return res.status(200).json({ success: false, error: 'Nada para atualizar.' });
    patch.updated_date = new Date().toISOString();

    const r = await sb(`app_users?id=eq.${encodeURIComponent(sellerId)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
    const rows = await r.json();
    if (!r.ok || !Array.isArray(rows) || !rows.length) {
      return res.status(200).json({ success: false, error: 'Falha ao atualizar', details: JSON.stringify(rows).slice(0, 200) });
    }
    const out = { ...rows[0] };
    delete out.password;
    return res.status(200).json({ success: true, seller: out });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao atualizar vendedor', details: String(e?.message || e) });
  }
}
