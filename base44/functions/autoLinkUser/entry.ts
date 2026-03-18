import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const payload = await req.json().catch(() => ({}));
    const event = payload?.event || null;
    const entityName = event?.entity_name || null;

    if (entityName !== 'AppUser') {
      return new Response(JSON.stringify({ success: true, skipped: 'not_appuser' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Carrega dados do usuário do evento; se faltarem, busca do banco
    let user = payload?.data || null;
    if (!user || payload?.payload_too_large) {
      const id = event?.entity_id;
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: 'no_user_data' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      user = await base44.asServiceRole.entities.AppUser.get(id);
    }

    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'user_not_found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Regra: apenas usuários normais (role === 'user') e sem indicador recebem o Site Oficial como referrer
    const hasRef = !!user.referred_by_id && String(user.referred_by_id).trim() !== '';
    if (user.role !== 'user' || hasRef) {
      return new Response(JSON.stringify({ success: true, skipped: 'no_action' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Localiza/garante o "Leilão NoZap - Site Oficial"
    let siteLicensee = null;
    const byEmail = await base44.asServiceRole.entities.AppUser.filter({ email: 'site@leilaonozap.com' });
    if (Array.isArray(byEmail) && byEmail.length > 0) {
      siteLicensee = byEmail[0];
    } else {
      const byName = await base44.asServiceRole.entities.AppUser.filter({ full_name: 'Leilão NoZap - Site Oficial' });
      if (Array.isArray(byName) && byName.length > 0) {
        siteLicensee = byName[0];
      } else {
        // fallback: cria se não existir
        siteLicensee = await base44.asServiceRole.entities.AppUser.create({
          full_name: 'Leilão NoZap - Site Oficial',
          nickname: 'Site Oficial',
          email: 'site@leilaonozap.com',
          password: 'SITE_ADMIN_2025_SECURE_' + Date.now(),
          phone: '(21) 00000-0000',
          role: 'licensee',
          referral_code: 'SITE2025',
          terms_accepted: true,
          avatar_color: '#22c55e',
          career_levels: ['licenciado_aplicativo'],
          primary_career_level: 'licenciado_aplicativo'
        });
      }
    }

    if (!siteLicensee || !siteLicensee.id || siteLicensee.id === user.id) {
      return new Response(JSON.stringify({ success: true, skipped: 'invalid_site_licensee' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Aplica o vínculo
    await base44.asServiceRole.entities.AppUser.update(user.id, { referred_by_id: siteLicensee.id });

    return new Response(JSON.stringify({ success: true, linked_to: siteLicensee.id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});