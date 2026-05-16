import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function onlyDigits(v) {
  return (v || '').replace(/\D/g, '');
}

function normalizePhoneToBR(phone) {
  const digits = onlyDigits(phone);
  if (!digits) return '';
  // Se já começa com 55 e tem 12-13 dígitos, mantém
  if (digits.length >= 12 && digits.startsWith('55')) return digits;
  // Senão prefixa 55
  return '55' + digits;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1) Auth
    const caller = await base44.auth.me();
    if (!caller || !caller.email) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const callerAppUsers = await base44.asServiceRole.entities.AppUser.filter({ email: caller.email });
    const callerAppUser = callerAppUsers && callerAppUsers[0];
    if (!callerAppUser) {
      return Response.json({ success: false, error: 'AppUser do chamador não encontrado' }, { status: 401 });
    }

    // 2) Validar role (licenciado/licensee/admin)
    const callerLevels = Array.isArray(callerAppUser.career_levels) ? callerAppUser.career_levels : [];
    const isLicensee =
      callerLevels.includes('licenciado_catalogo') ||
      callerAppUser.role === 'licensee' ||
      callerAppUser.role === 'admin';

    if (!isLicensee) {
      return Response.json({ success: false, error: 'Forbidden: apenas licenciados podem gerar link de acesso' }, { status: 403 });
    }

    // 3) Payload
    const body = await req.json().catch(() => ({}));
    const { seller_id } = body || {};
    if (!seller_id) {
      return Response.json({ success: false, error: 'seller_id é obrigatório' }, { status: 400 });
    }

    // 4) Buscar vendedor e validar ownership
    const seller = await base44.asServiceRole.entities.AppUser.get(seller_id).catch(() => null);
    if (!seller) {
      return Response.json({ success: false, error: 'Vendedor não encontrado' }, { status: 404 });
    }

    if (callerAppUser.role !== 'admin' && seller.recruited_by_id !== callerAppUser.id) {
      return Response.json({ success: false, error: 'Forbidden: este vendedor não pertence à sua rede' }, { status: 403 });
    }

    if (!seller.is_seller) {
      return Response.json({ success: false, error: 'Usuário não é um vendedor ativo' }, { status: 400 });
    }

    if (!seller.phone) {
      return Response.json({ success: false, error: 'Vendedor não possui telefone cadastrado' }, { status: 400 });
    }

    // 5) Gerar token único (44+ chars, criptograficamente seguro)
    const uuid = crypto.randomUUID();
    const suffix = Date.now().toString(36);
    const token = `${uuid}-${suffix}`;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    // 6) Salvar token no AppUser (invalida token anterior automaticamente)
    await base44.asServiceRole.entities.AppUser.update(seller.id, {
      access_token: token,
      access_token_expires: expiresAt.toISOString(),
    });

    // 7) Montar links
    const magicLink = `https://leilaonozap.net/acesso-vendedor?t=${token}`;
    const phoneBR = normalizePhoneToBR(seller.phone);
    const firstName = (seller.full_name || 'Vendedor').split(' ')[0];

    const messageText =
`Olá ${firstName}! 👋

Seu painel de vendedor no Leilão NoZap está pronto.

🔑 Acesse pelo link abaixo para definir sua senha:
${magicLink}

📅 Link válido por 7 dias.

Após definir sua senha, você poderá entrar normalmente com seu e-mail.`;

    const whatsappUrl = phoneBR
      ? `https://wa.me/${phoneBR}?text=${encodeURIComponent(messageText)}`
      : null;

    return Response.json({
      success: true,
      token,
      magic_link: magicLink,
      expires_at: expiresAt.toISOString(),
      whatsapp_url: whatsappUrl,
    });
  } catch (error) {
    console.error('[generateSellerAccessToken] Erro:', error);
    return Response.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
  }
});