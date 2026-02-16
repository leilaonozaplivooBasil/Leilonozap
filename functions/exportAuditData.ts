import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas admin pode exportar dados de auditoria
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { start_date, end_date, user_id } = await req.json();

    // Query com filtros
    let query = {};
    
    if (start_date) {
      query.created_date = { $gte: start_date };
    }
    
    if (user_id) {
      query.user_id = user_id;
    }

    // Busca dados para auditoria
    const [commissions, users, catalogSales] = await Promise.all([
      base44.asServiceRole.entities.CommissionRecord.filter(query),
      base44.asServiceRole.entities.AppUser.list(),
      base44.asServiceRole.entities.CatalogSale.filter(
        start_date ? { created_date: { $gte: start_date } } : {}
      )
    ]);

    // Monta estrutura organizada para auditoria
    const auditData = {
      export_date: new Date().toISOString(),
      filters: { start_date, end_date, user_id },
      summary: {
        total_commissions: commissions.length,
        total_users: users.length,
        total_sales: catalogSales.length,
        total_commission_amount: commissions.reduce((sum, c) => sum + (c.amount || 0), 0)
      },
      users: users.map(u => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        career_levels: u.career_levels,
        commission_balance: u.commission_balance,
        total_commissions_generated: u.total_commissions_generated,
        referred_by_id: u.referred_by_id,
        referral_code: u.referral_code
      })),
      commissions: commissions.map(c => ({
        id: c.id,
        user_id: c.user_id,
        user_name: c.user_name,
        sale_id: c.sale_id,
        amount: c.amount,
        percentage: c.percentage,
        role: c.role,
        created_date: c.created_date,
        sale_type: c.sale_type
      })),
      sales: catalogSales.map(s => ({
        id: s.id,
        product_name: s.product_name,
        total_amount: s.total_amount,
        status: s.status,
        buyer_name: s.buyer_name,
        licensee_id: s.licensee_id,
        created_date: s.created_date
      }))
    };

    return Response.json({
      success: true,
      data: auditData
    });

  } catch (error) {
    console.error('Erro ao exportar dados de auditoria:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});