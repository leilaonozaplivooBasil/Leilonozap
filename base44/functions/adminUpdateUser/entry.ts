import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Campos que o admin pode editar pelo modal de usuário
const ALLOWED = [
  'full_name', 'nickname', 'email', 'phone', 'role', 'referred_by_id',
  'career_levels', 'primary_career_level', 'display_first_name',
  'display_last_name', 'avatar_url', 'enabled_panels', 'is_seller', 'store_name',
];

// Retry helper — base44.asServiceRole falha intermitentemente com 401 no Deno
async function withRetry(fn, retries = 4) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < retries - 1) await new Promise(r => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw lastErr;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Auth custom via localStorage (LoginModal) — sem sessão da plataforma.
    // Segurança real = guard de actorId + role admin abaixo (mantido intacto).
    const body = await req.json();
    const { userId, updates, actorId } = body || {};

    if (!userId || !updates || typeof updates !== 'object') {
      return Response.json({ success: false, error: 'userId e updates são obrigatórios' }, { status: 400 });
    }
    if (!actorId) {
      return Response.json({ success: false, error: 'Sem credencial de admin' }, { status: 403 });
    }

    // Guard: actor precisa ser admin/super_admin
    // Usa retry + fallback filter para contornar 401 intermitente do asServiceRole no Deno
    let actor = null;
    try {
      actor = await withRetry(() => base44.asServiceRole.entities.AppUser.get(actorId));
    } catch (e1) {
      try {
        const results = await withRetry(() => base44.asServiceRole.entities.AppUser.filter({ id: actorId }));
        actor = results && results[0];
      } catch (e2) {
        return Response.json({ success: false, error: 'Erro ao verificar permissões: ' + e1.message }, { status: 500 });
      }
    }
    if (!actor || !['admin', 'super_admin'].includes(actor.role)) {
      return Response.json({ success: false, error: 'Apenas admin pode editar usuários' }, { status: 403 });
    }

    // Monta payload só com campos permitidos
    const payload = {};
    for (const k of ALLOWED) {
      if (k in updates) payload[k] = updates[k];
    }
    if (Object.keys(payload).length === 0) {
      return Response.json({ success: false, error: 'Nenhum campo válido para atualizar' }, { status: 400 });
    }

    // Sanitiza campos string — null vira string vazia para evitar 422
    for (const k of ['phone', 'nickname', 'full_name', 'email', 'display_first_name', 'display_last_name', 'avatar_url']) {
      if (k in payload && (payload[k] === null || payload[k] === undefined)) {
        payload[k] = '';
      }
    }

    const updatedUser = await withRetry(() => base44.asServiceRole.entities.AppUser.update(userId, payload));

    return Response.json({ success: true, user: updatedUser });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});