import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function normalizeCpf(v) {
  return (v || "").replace(/\D/g, "");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1) Auth
    const caller = await base44.auth.me();
    if (!caller || !caller.email) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 1.1) Resolver AppUser real do chamador
    const callerAppUsers = await base44.asServiceRole.entities.AppUser.filter({ email: caller.email });
    const callerAppUser = callerAppUsers && callerAppUsers[0];
    if (!callerAppUser) {
      return Response.json({ success: false, error: 'AppUser do chamador não encontrado' }, { status: 401 });
    }

    // 2) Validar role
    const callerLevels = Array.isArray(callerAppUser.career_levels) ? callerAppUser.career_levels : [];
    const isLicensee =
      callerLevels.includes('licenciado_catalogo') ||
      callerAppUser.role === 'licensee' ||
      callerAppUser.role === 'admin';

    if (!isLicensee) {
      return Response.json({ success: false, error: 'Forbidden: apenas licenciados podem editar vendedores' }, { status: 403 });
    }

    // 3) Payload
    const body = await req.json().catch(() => ({}));
    const { seller_id, full_name, store_name, phone, cpf, avatar_url } = body || {};

    if (!seller_id) {
      return Response.json({ success: false, error: 'seller_id é obrigatório' }, { status: 400 });
    }

    // 4) Buscar o vendedor e validar ownership
    const seller = await base44.asServiceRole.entities.AppUser.get(seller_id).catch(() => null);
    if (!seller) {
      return Response.json({ success: false, error: 'Vendedor não encontrado' }, { status: 404 });
    }

    // Admin pode editar qualquer vendedor; licenciado só os próprios
    if (callerAppUser.role !== 'admin' && seller.recruited_by_id !== callerAppUser.id) {
      return Response.json({ success: false, error: 'Forbidden: este vendedor não pertence à sua rede' }, { status: 403 });
    }

    if (!seller.is_seller) {
      return Response.json({ success: false, error: 'Usuário não é um vendedor ativo' }, { status: 400 });
    }

    // 5) Montar payload de edição (APENAS campos permitidos)
    const updatePayload = {};

    if (typeof full_name === 'string' && full_name.trim()) {
      updatePayload.full_name = full_name.trim();
    }
    if (typeof store_name === 'string') {
      updatePayload.store_name = store_name.trim() || null;
    }
    if (typeof phone === 'string' && phone.trim()) {
      updatePayload.phone = phone.trim();
    }
    if (typeof avatar_url === 'string') {
      updatePayload.avatar_url = avatar_url || null;
    }

    // CPF: só atualiza se atual estiver vazio
    const cleanCpf = normalizeCpf(cpf);
    if (cleanCpf && !seller.cpf) {
      updatePayload.cpf = cleanCpf;
    }

    if (Object.keys(updatePayload).length === 0) {
      return Response.json({ success: false, error: 'Nenhum campo válido para atualizar' }, { status: 400 });
    }

    const updated = await base44.asServiceRole.entities.AppUser.update(seller_id, updatePayload);

    return Response.json({ success: true, seller: updated });
  } catch (error) {
    console.error('[updateSeller] Erro:', error);
    return Response.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
  }
});