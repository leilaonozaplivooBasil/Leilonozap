// adminUpdateUser — admin edita usuário completo (cargos, role, dados básicos).
// Rota Vercel que o adapter Supabase (base44.functions.invoke) chama via /api/functions/adminUpdateUser.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED = [
  'full_name', 'nickname', 'email', 'phone', 'role', 'referred_by_id',
  'career_levels', 'primary_career_level', 'display_first_name',
  'display_last_name', 'avatar_url', 'enabled_panels', 'is_seller', 'store_name',
];

const STRING_FIELDS = ['full_name', 'nickname', 'email', 'phone', 'display_first_name', 'display_last_name', 'avatar_url'];

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

async function isAdmin(actorId) {
  if (!actorId) return false;
  const rows = await (await sb(`app_users?select=role&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
  const a = rows && rows[0];
  return a && ['admin', 'super_admin'].includes(a.role);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { userId, updates, actorId } = body || {};

    if (!userId || !updates || typeof updates !== 'object') {
      return res.status(200).json({ success: false, error: 'userId e updates são obrigatórios' });
    }
    if (!await isAdmin(actorId)) {
      return res.status(200).json({ success: false, error: 'Apenas admin pode editar usuários' });
    }

    // Monta payload só com campos permitidos
    const payload = {};
    for (const k of ALLOWED) {
      if (k in updates) payload[k] = updates[k];
    }
    if (Object.keys(payload).length === 0) {
      return res.status(200).json({ success: false, error: 'Nenhum campo válido para atualizar' });
    }

    // Sanitiza campos string — null/undefined vira string vazia para evitar 422 do Postgrest
    for (const k of STRING_FIELDS) {
      if (k in payload && (payload[k] === null || payload[k] === undefined)) {
        payload[k] = '';
      }
    }

    // Update via Postgrest
    const updateResp = await sb(`app_users?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });

    if (!updateResp.ok) {
      const errText = await updateResp.text().catch(() => '');
      return res.status(200).json({ success: false, error: `Erro ao salvar: ${updateResp.status} ${errText}` });
    }

    const updatedRows = await updateResp.json();
    const updatedUser = updatedRows && updatedRows[0];

    if (!updatedUser) {
      return res.status(200).json({ success: false, error: 'Usuário não encontrado após update' });
    }

    // Confirma que primary_career_level foi gravado
    if (payload.primary_career_level && updatedUser.primary_career_level !== payload.primary_career_level) {
      return res.status(200).json({ success: false, error: 'O servidor não confirmou a alteração da função principal.' });
    }

    return res.status(200).json({ success: true, user: updatedUser });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}