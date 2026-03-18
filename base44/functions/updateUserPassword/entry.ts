import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    
    const { user_id, new_password } = payload;
    
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