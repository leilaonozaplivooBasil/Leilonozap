import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, userId } = await req.json().catch(() => ({}));
    if (!token) return Response.json({ valid: false, error: 'Token ausente' }, { status: 400 });

    let user = null;
    if (userId) {
      try {
        const u = await base44.asServiceRole.entities.AppUser.get(userId);
        if (u && u.access_token === token) user = u;
      } catch(e) {}
    }
    if (!user) {
      const results = await base44.asServiceRole.entities.AppUser.filter({ access_token: token });
      if (results && results.length > 0) user = results[0];
    }
    if (!user) return Response.json({ valid: false, error: 'Token não encontrado' }, { status: 404 });
    if (user.access_token_expires && new Date(user.access_token_expires) < new Date())
      return Response.json({ valid: false, error: 'Token expirado' }, { status: 410 });

    return Response.json({ valid: true, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, is_seller: user.is_seller, access_token: user.access_token, access_token_expires: user.access_token_expires } });
  } catch(e) {
    return Response.json({ valid: false, error: e.message }, { status: 500 });
  }
});