// manageMetas — CEO/admin define metas por categoria (career level). action: list|set|remove|searchUsers.
// A meta vale pra TODOS da categoria do login escolhido. Guard de escrita: super_admin/admin (CEO).
import crypto from 'crypto';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const oid = () => crypto.randomBytes(12).toString('hex');

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const action = String(body?.action || 'list');
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    if (action === 'list') {
      const rows = await (await sb(`metas?select=*&ativo=eq.true&order=created_at.desc`)).json();
      return res.status(200).json({ success: true, metas: Array.isArray(rows) ? rows : [] });
    }

    // escrita/busca exige CEO/admin
    const actorId = String(body?.actorId || '').trim();
    const actorArr = await (await sb(`app_users?select=id,role,full_name&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    if (!actor || !['admin', 'super_admin'].includes(actor.role)) return res.status(403).json({ success: false, error: 'Só o CEO/admin pode definir metas' });

    if (action === 'searchUsers') {
      const q = String(body?.q || '').trim();
      if (q.length < 2) return res.status(200).json({ success: true, users: [] });
      const enc = encodeURIComponent(`%${q}%`);
      const rows = await (await sb(`app_users?select=id,full_name,email,primary_career_level&or=(full_name.ilike.${enc},email.ilike.${enc})&limit=15`)).json();
      return res.status(200).json({ success: true, users: Array.isArray(rows) ? rows : [] });
    }

    if (action === 'set') {
      let categoria = String(body?.categoria || '').trim();
      const targetUserId = String(body?.target_user_id || '').trim();
      const valor = Number(body?.valor) || 0;
      const periodo = String(body?.periodo || 'dia');
      if (!categoria && targetUserId) {
        const t = await (await sb(`app_users?select=primary_career_level&id=eq.${encodeURIComponent(targetUserId)}&limit=1`)).json();
        categoria = Array.isArray(t) && t[0] ? t[0].primary_career_level : '';
      }
      if (!categoria || !(valor > 0)) return res.status(400).json({ success: false, error: 'Categoria e valor (>0) obrigatórios' });
      // desativa meta anterior da mesma categoria/período e cria a nova
      await sb(`metas?categoria=eq.${encodeURIComponent(categoria)}&periodo=eq.${encodeURIComponent(periodo)}&ativo=eq.true`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ativo: false }) });
      const payload = { id: oid(), categoria, periodo, valor, ativo: true, set_by: actorId, set_by_name: actor.full_name || 'CEO' };
      const r = await sb('metas', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
      const rows = await r.json();
      if (!r.ok) return res.status(200).json({ success: false, error: 'Falha ao salvar meta', details: JSON.stringify(rows).slice(0, 200) });
      return res.status(200).json({ success: true, meta: Array.isArray(rows) ? rows[0] : rows });
    }

    if (action === 'remove') {
      const id = String(body?.id || '').trim();
      const categoria = String(body?.categoria || '').trim();
      const filt = id ? `id=eq.${encodeURIComponent(id)}` : `categoria=eq.${encodeURIComponent(categoria)}`;
      await sb(`metas?${filt}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ativo: false }) });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Ação inválida' });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
