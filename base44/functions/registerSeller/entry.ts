import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function slugify(str) {
  return (str || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCpf(v) {
  return (v || "").replace(/\D/g, "");
}

async function generateUniqueReferralCode(base44, baseSlug) {
  const fallback = baseSlug || "vendedor";
  let candidate = fallback;
  let attempt = 0;

  while (attempt < 10) {
    const existing = await base44.asServiceRole.entities.AppUser.filter({ referral_code: candidate });
    if (!existing || existing.length === 0) {
      return candidate;
    }
    attempt++;
    const suffix = Math.random().toString(36).slice(2, 6);
    candidate = `${fallback}-${suffix}`;
  }

  // Última cartada — garante unicidade com timestamp
  return `${fallback}-${Date.now().toString(36)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1) Autenticação
    const caller = await base44.auth.me();
    if (!caller || !caller.id) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2) Validação: chamador precisa ser licenciado, licensee ou admin
    const callerLevels = Array.isArray(caller.career_levels) ? caller.career_levels : [];
    const isLicensee =
      callerLevels.includes('licenciado_catalogo') ||
      caller.role === 'licensee' ||
      caller.role === 'admin';

    if (!isLicensee) {
      return Response.json(
        { success: false, error: 'Forbidden: apenas licenciados podem cadastrar vendedores' },
        { status: 403 }
      );
    }

    // 3) Payload
    const body = await req.json().catch(() => ({}));
    const {
      cpf,
      full_name,
      store_name,
      email,
      phone,
      avatar_url
    } = body || {};

    if (!full_name || !full_name.trim()) {
      return Response.json({ success: false, error: 'full_name é obrigatório' }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return Response.json({ success: false, error: 'phone é obrigatório' }, { status: 400 });
    }

    const cleanCpf = normalizeCpf(cpf);
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanFullName = full_name.trim();
    const cleanStoreName = (store_name || '').trim();
    const cleanPhone = phone.trim();

    // 4) Verifica duplicidade por CPF ou email
    let existingUser = null;

    if (cleanCpf) {
      const byCpf = await base44.asServiceRole.entities.AppUser.filter({ cpf: cleanCpf });
      if (byCpf && byCpf.length > 0) existingUser = byCpf[0];
    }

    if (!existingUser && cleanEmail) {
      const byEmail = await base44.asServiceRole.entities.AppUser.filter({ email: cleanEmail });
      if (byEmail && byEmail.length > 0) existingUser = byEmail[0];
    }

    // 5) Gera referral_code único
    const baseSlug = slugify(cleanStoreName) || slugify(cleanFullName) || 'vendedor';
    const referralCode = existingUser?.referral_code && existingUser.referral_code.trim() !== ''
      ? existingUser.referral_code
      : await generateUniqueReferralCode(base44, baseSlug);

    let seller;

    if (existingUser) {
      // 6a) Atualiza existente vinculando como vendedor
      const updatePayload = {
        full_name: cleanFullName,
        store_name: cleanStoreName || existingUser.store_name || null,
        phone: cleanPhone,
        avatar_url: avatar_url || existingUser.avatar_url || null,
        is_seller: true,
        recruited_by_id: caller.id,
        referral_code: referralCode,
        nickname: existingUser.nickname || referralCode,
        terms_accepted: true
      };

      // Só preenche referred_by_id se ainda não tinha indicador (preserva rede existente)
      if (!existingUser.referred_by_id) {
        updatePayload.referred_by_id = caller.id;
      }

      // Só preenche CPF se ainda não tinha
      if (cleanCpf && !existingUser.cpf) {
        updatePayload.cpf = cleanCpf;
      }

      // Só preenche email se ainda não tinha
      if (cleanEmail && !existingUser.email) {
        updatePayload.email = cleanEmail;
      }

      seller = await base44.asServiceRole.entities.AppUser.update(existingUser.id, updatePayload);
    } else {
      // 6b) Cria novo vendedor
      if (!cleanEmail) {
        return Response.json({ success: false, error: 'email é obrigatório para novo vendedor' }, { status: 400 });
      }

      const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

      const createPayload = {
        full_name: cleanFullName,
        email: cleanEmail,
        phone: cleanPhone,
        password: tempPassword,
        cpf: cleanCpf || null,
        store_name: cleanStoreName || null,
        avatar_url: avatar_url || null,
        role: 'user',
        is_seller: true,
        recruited_by_id: caller.id,
        referred_by_id: caller.id,
        career_levels: ['usuario'],
        primary_career_level: 'usuario',
        referral_code: referralCode,
        nickname: referralCode,
        terms_accepted: true
      };

      seller = await base44.asServiceRole.entities.AppUser.create(createPayload);
    }

    const storeLink = `https://leilaonozap.net/Loja-Virtual?ref=${referralCode}`;

    return Response.json({
      success: true,
      seller,
      store_link: storeLink
    });
  } catch (error) {
    console.error('[registerSeller] Erro:', error);
    return Response.json(
      { success: false, error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
});