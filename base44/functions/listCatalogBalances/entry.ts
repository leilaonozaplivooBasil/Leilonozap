import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Ensure latest balances are reflected (optional but useful)
    try {
      await base44.functions.invoke('reconcileCatalogBalances', {});
    } catch (_) {}

    // Fetch users and map balances
    const users = await base44.asServiceRole.entities.AppUser.list();
    const items = (users || [])
      .map((u) => {
        const bal = Number(u.catalog_commission_balance || 0);
        const total = Number(u.catalog_total_commissions_generated || 0);
        return {
          name: u.full_name,
          email: u.email,
          balance: Math.round(bal * 100) / 100,
          total_generated: Math.round(total * 100) / 100,
        };
      })
      .filter((x) => x.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    const total_balance = items.reduce((sum, x) => sum + x.balance, 0);

    return Response.json({
      success: true,
      count: items.length,
      total_balance: Math.round(total_balance * 100) / 100,
      items,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});