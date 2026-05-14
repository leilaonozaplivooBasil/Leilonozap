import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    const callerLevels = Array.isArray(callerAppUser.career_levels) ? callerAppUser.career_levels : [];
    const isLicensee =
      callerLevels.includes('licenciado_catalogo') ||
      callerAppUser.role === 'licensee' ||
      callerAppUser.role === 'admin';

    if (!isLicensee) {
      return Response.json({ success: false, error: 'Forbidden: apenas licenciados podem excluir vendedores' }, { status: 403 });
    }

    // 2) Payload
    const body = await req.json().catch(() => ({}));
    const { seller_id } = body || {};
    if (!seller_id) {
      return Response.json({ success: false, error: 'seller_id é obrigatório' }, { status: 400 });
    }

    // 3) Buscar vendedor e validar ownership
    const seller = await base44.asServiceRole.entities.AppUser.get(seller_id).catch(() => null);
    if (!seller) {
      return Response.json({ success: false, error: 'Vendedor não encontrado' }, { status: 404 });
    }

    if (callerAppUser.role !== 'admin' && seller.recruited_by_id !== callerAppUser.id) {
      return Response.json({ success: false, error: 'Forbidden: este vendedor não pertence à sua rede' }, { status: 403 });
    }

    // 4) Verificar se há vendas (CatalogSale.licensee_id === seller_id)
    const sales = await base44.asServiceRole.entities.CatalogSale.filter({ licensee_id: seller_id });
    const salesCount = Array.isArray(sales) ? sales.length : 0;

    if (salesCount === 0) {
      // Hard delete — sem histórico financeiro
      await base44.asServiceRole.entities.AppUser.delete(seller_id);
      return Response.json({ success: true, action: 'deleted', sales_count: 0 });
    }

    // Soft unlink — preserva histórico
    await base44.asServiceRole.entities.AppUser.update(seller_id, {
      is_seller: false,
      recruited_by_id: null,
      referred_by_id: null,
      referral_code: null,
    });

    return Response.json({ success: true, action: 'unlinked', sales_count: salesCount });
  } catch (error) {
    console.error('[deleteSeller] Erro:', error);
    return Response.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
  }
});