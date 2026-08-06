import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const { credential, ref_code } = await req.json();
    if (!credential) {
      return Response.json({ error: 'Token do Google não informado.' }, { status: 400 });
    }

    // Verifica o ID token direto com o Google (não precisa de client secret pra isso)
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!verifyRes.ok) {
      return Response.json({ error: 'Token do Google inválido ou expirado.' }, { status: 401 });
    }
    const payload = await verifyRes.json();

    const expectedClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    if (!expectedClientId || payload.aud !== expectedClientId) {
      return Response.json({ error: 'Token do Google não pertence a este app.' }, { status: 401 });
    }

    const emailVerified = payload.email_verified === 'true' || payload.email_verified === true;
    if (!emailVerified) {
      return Response.json({ error: 'E-mail do Google não verificado.' }, { status: 401 });
    }

    const email = String(payload.email || '').toLowerCase().trim();
    if (!email) {
      return Response.json({ error: 'Não foi possível obter o e-mail da conta Google.' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    const existing = await base44.asServiceRole.entities.AppUser.filter({ email });
    let user;

    if (existing && existing.length > 0) {
      user = existing[0];
    } else {
      // 🌳 Indicador do link (ref_code) tem prioridade; sem ele, a raiz Site Oficial.
      let referred_by_id = null;
      const code = String(ref_code || '').trim();
      if (code) {
        const ind = await base44.asServiceRole.entities.AppUser.filter({ referral_code: code });
        if (ind && ind[0]) referred_by_id = ind[0].id;
      }
      if (!referred_by_id) {
        const site = await base44.asServiceRole.entities.AppUser.filter({ referral_code: 'leilaonozap' });
        if (site && site[0]) referred_by_id = site[0].id;
      }
      user = await base44.asServiceRole.entities.AppUser.create({
        full_name: payload.name || email.split('@')[0],
        email,
        password: crypto.randomUUID(),
        phone: '',
        referred_by_id,
        avatar_url: payload.picture || ''
      });
    }

    return Response.json({ success: true, user });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});