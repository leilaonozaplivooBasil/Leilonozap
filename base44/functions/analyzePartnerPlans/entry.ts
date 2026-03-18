import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const allPurchases = await base44.asServiceRole.entities.PartnerPlanPurchase.list('-created_date', 5000);
    const allUsers = await base44.asServiceRole.entities.AppUser.list('-created_date', 5000);
    
    // Planos ativos via PartnerPlanPurchase
    const activePurchases = allPurchases.filter(p => p.is_active === true);
    
    // Usuários com planos ativos no campo active_partner_plan
    const usersWithActivePlans = allUsers.filter(u => u.active_partner_plan && u.active_partner_plan.trim() !== '');
    
    return Response.json({
      total_purchases: allPurchases.length,
      active_purchases: activePurchases.length,
      active_purchases_list: activePurchases.map(p => ({
        id: p.id,
        user_id: p.user_id,
        plan_name: p.plan_name,
        amount: p.amount,
        payment_method: p.payment_method,
        activated_at: p.activated_at,
        created_date: p.created_date
      })),
      users_with_active_plan_field: usersWithActivePlans.length,
      users_with_active_plan_list: usersWithActivePlans.map(u => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        active_partner_plan: u.active_partner_plan,
        partner_plan_amount: u.partner_plan_amount,
        partner_plan_activated_at: u.partner_plan_activated_at
      }))
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});