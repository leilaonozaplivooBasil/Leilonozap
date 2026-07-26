// adminUpdateUser — atualiza um usuário (app_users) com service_role, bypassando RLS.
// O app usa só a anon key (auth custom em app_users), então UPDATE direto via PostgREST
// dá no-op silencioso (RLS de escrita é só pra 'authenticated'). Esta route resolve isso.
// Guard: quem chama (actorId) precisa ser admin/super_admin no banco.
// ⚠️ Segurança: guard provisório baseado em actorId (modelo client-trust atual). Trocar por
// Supabase Auth + verificação de JWT antes do go-live público. Ver auditoria 2026-06-10.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

// Campos que o admin pode editar pelo modal de usuário
const ALLOWED = [
  'full_name', 'nickname', 'email', 'phone', 'role', 'referred_by_id',
  'career_levels', 'primary_career_level', 'display_first_name',
  'display_last_name', 'avatar_url', 'profile_photo_url', 'enabled_panels',
  'is_seller', 'store_name',
  // 'active' = arquivar/reativar usuário sem apagar histórico (painel da rede)
  'active',
];

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== 'object') body = {};
    const { userId, updates, actorId } = body;

    if (!SUPABASE_URL || !SR) {
      return res.status(500).json({ success: false, error: 'Config do servidor ausente (service role)' });
    }
    if (!userId || !updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'userId e updates são obrigatórios' });
    }
    if (!actorId) {
      return res.status(403).json({ success: false, error: 'Sem credencial de admin' });
    }

    // Guard: actor precisa ser admin/super_admin
    const actorResp = await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(actorId)}&limit=1`);
    const actorArr = await actorResp.json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    if (!actor || !['admin', 'super_admin'].includes(actor.role)) {
      return res.status(403).json({ success: false, error: 'Apenas admin pode editar usuários' });
    }

    // Monta payload só com campos permitidos
    const payload = {};
    for (const k of ALLOWED) if (k in updates) payload[k] = updates[k];
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum campo válido para atualizar' });
    }

    // 🛡️ ANTI-REBAIXAMENTO: nunca tirar o acesso de um admin/super_admin sem pedir explicitamente.
    // O form "Loja Virtual do Vendedor" manda role='licensee'; se o alvo já é admin, isso apagava
    // o acesso dele (aconteceu com um super_admin em 12/07). Só rebaixa com allow_role_downgrade=true.
    const tgtArr = await (await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
    const target = Array.isArray(tgtArr) ? tgtArr[0] : null;
    const targetIsAdmin = target && ['admin', 'super_admin'].includes(target.role);
    if (targetIsAdmin && payload.role && !['admin', 'super_admin'].includes(payload.role) && body?.allow_role_downgrade !== true) {
      delete payload.role;            // preserva o acesso admin
      delete payload.career_levels;   // e o cargo que vem junto (ex.: ceo → licenciado_catalogo)
      delete payload.primary_career_level;
    }

    if (Object.keys(payload).length === 0) {
      return res.status(200).json({ success: true, skipped: 'nada a atualizar (role de admin preservado)' });
    }
    payload.updated_date = new Date().toISOString();

    const upd = await sb(`app_users?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
    const rows = await upd.json();
    if (!upd.ok) {
      return res.status(upd.status).json({ success: false, error: 'Falha ao salvar', details: rows });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    return res.status(200).json({ success: true, user: rows[0] });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Erro ao salvar', details: String((e && e.message) || e) });
  }
}
