import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Campos que o admin pode editar pelo modal de usuário
const ALLOWED = [
  'full_name', 'nickname', 'email', 'phone', 'role', 'referred_by_id',
  'career_levels', 'primary_career_level', 'display_first_name',
  'display_last_name', 'avatar_url', 'enabled_panels', 'is_seller', 'store_name',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();
    if (!authUser) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { userId, updates, actorId } = body || {};

    if (!userId || !updates || typeof updates !== 'object') {
      return Response.json({ success: false, error: 'userId e updates são obrigatórios' }, { status: 400 });
    }
    if (!actorId) {
      return Response.json({ success: false, error: 'Sem credencial de admin' }, { status: 403 });
    }

    // Guard: actor precisa ser admin/super_admin
    const actor = await base44.asServiceRole.entities.AppUser.get(actorId);
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

    const updatedUser = await base44.asServiceRole.entities.AppUser.update(userId, payload);

    return Response.json({ success: true, user: updatedUser });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});