import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import bcrypt from 'npm:bcryptjs@3.0.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { token, new_password, action } = body || {};

    if (!token || typeof token !== 'string') {
      return Response.json({ success: false, error: 'Token inválido' }, { status: 400 });
    }

    // 1) Buscar usuário com esse token
    const users = await base44.asServiceRole.entities.AppUser.filter({ access_token: token });
    const user = users && users[0];

    if (!user) {
      return Response.json({ success: false, error: 'Link inválido ou já utilizado.' }, { status: 401 });
    }

    // 2) Verificar expiração
    if (user.access_token_expires) {
      const expiresAt = new Date(user.access_token_expires);
      if (expiresAt < new Date()) {
        return Response.json({ success: false, error: 'Link expirado. Solicite um novo link de acesso.' }, { status: 401 });
      }
    }

    // 3) Modo "check" — apenas valida o token, retorna dados básicos para mostrar tela de definir senha
    if (action === 'check') {
      return Response.json({
        success: true,
        seller: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          store_name: user.store_name || null,
          avatar_url: user.avatar_url || null,
        },
      });
    }

    // 4) Modo "set_password" (default) — define a senha
    if (!new_password || typeof new_password !== 'string' || new_password.length < 6) {
      return Response.json({ success: false, error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    const updated = await base44.asServiceRole.entities.AppUser.update(user.id, {
      password: hashedPassword,
      access_token: null,
      access_token_expires: null,
    });

    // Remove campos sensíveis antes de devolver pro frontend
    const safeUser = { ...updated };
    delete safeUser.password;
    delete safeUser.access_token;
    delete safeUser.access_token_expires;
    delete safeUser.password_reset_token;
    delete safeUser.password_reset_expires;

    return Response.json({ success: true, user: safeUser });
  } catch (error) {
    console.error('[validateSellerAccessToken] Erro:', error);
    return Response.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
  }
});