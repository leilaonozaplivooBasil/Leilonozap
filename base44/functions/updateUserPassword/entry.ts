import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    
    const { user_id, new_password, validate_token } = payload;

    // Modo validação de token (busca user_id via service role, bypass RLS)
    if (validate_token && !new_password) {
      const users = await base44.asServiceRole.entities.AppUser.filter({ password_reset_token: validate_token });
      if (!users || users.length === 0) {
        return Response.json({ error: 'Token inválido' }, { status: 404 });
      }
      const user = users[0];
      if (user.password_reset_expires && new Date(user.password_reset_expires) < new Date()) {
        return Response.json({ error: 'Token expirado' }, { status: 410 });
      }
      return Response.json({ success: true, user_id: user.id });
    }
    
    if (!user_id || !new_password) {
      return Response.json({ error: 'Missing user_id or new_password' }, { status: 400 });
    }
    
    if (new_password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    
    // Usa service role para bypass de RLS
    await base44.asServiceRole.entities.AppUser.update(user_id, { 
      password: new_password 
    });
    
    return Response.json({ success: true, message: 'Password updated successfully' });
    
  } catch (error) {
    console.error('Error updating password:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});