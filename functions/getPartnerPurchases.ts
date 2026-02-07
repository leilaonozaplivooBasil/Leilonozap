import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { user_id, status_filter, mode } = body;

    // mode = "admin" → retorna TODOS os ativos (para ActivePartners)
    // mode = "user"  → retorna apenas do user_id informado (para InvestorDashboard)

    if (mode === 'admin') {
      // Verifica se é admin
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }

      const purchases = await base44.asServiceRole.entities.PartnerPlanPurchase.filter(
        { status: status_filter || 'active' },
        '-activated_at',
        500
      );

      return Response.json({ success: true, purchases });
    }

    if (mode === 'user' && user_id) {
      // Busca planos de um usuário específico
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