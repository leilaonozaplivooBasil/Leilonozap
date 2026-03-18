import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { user_id, status_filter, mode, app_user_email, app_user_id } = body;

    // Verifica autenticação: plataforma OU AppUser
    let isAuthenticated = false;
    let isPlatformAdmin = false;

    try {
      const user = await base44.auth.me();
      if (user) {
        isAuthenticated = true;
        if (user.role === 'admin') isPlatformAdmin = true;
      }
    } catch (e) {
      // Sem token de plataforma - tenta via AppUser
    }

    // Fallback: verifica via AppUser
    if (!isAuthenticated) {
      if (app_user_email) {
        const appUsers = await base44.asServiceRole.entities.AppUser.filter({ email: app_user_email });
        if (appUsers.length > 0) {
          isAuthenticated = true;
          if (appUsers[0].role === 'admin') isPlatformAdmin = true;
        }
      } else if (app_user_id) {
        const appUsers = await base44.asServiceRole.entities.AppUser.filter({ id: app_user_id });
        if (appUsers.length > 0) {
          isAuthenticated = true;
          if (appUsers[0].role === 'admin') isPlatformAdmin = true;
        }
      }
    }

    if (!isAuthenticated) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // mode = "admin" → retorna TODOS os ativos (para ActivePartners)
    if (mode === 'admin') {
      if (!isPlatformAdmin) {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }

      const purchases = await base44.asServiceRole.entities.PartnerPlanPurchase.filter(
        { status: status_filter || 'active' },
        '-activated_at',
        500
      );

      return Response.json({ success: true, purchases });
    }

    // mode = "user" → retorna apenas do user_id informado (para InvestorDashboard)
    if (mode === 'user' && user_id) {
      const filter = { user_id };
      if (status_filter) {
        filter.status = status_filter;
      }

      const purchases = await base44.asServiceRole.entities.PartnerPlanPurchase.filter(
        filter,
        '-activated_at',
        100
      );

      return Response.json({ success: true, purchases });
    }

    return Response.json({ error: 'Parâmetros inválidos. Use mode=admin ou mode=user com user_id' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});