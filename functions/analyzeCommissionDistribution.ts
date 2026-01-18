import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await req.json();
    const { sale_id } = payload;

    if (!sale_id) {
      return Response.json({ error: 'Missing sale_id' }, { status: 400 });
    }

    // Busca venda
    const sales = await base44.asServiceRole.entities.CatalogSale.filter({ id: sale_id });
    if (sales.length === 0) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }
    const sale = sales[0];

    // Busca todas as comissões desta venda
    const commissions = await base44.asServiceRole.entities.CommissionRecord.filter({ sale_id });

    // Busca dados dos usuários
    const userMap = new Map();
    for (const comm of commissions) {
      if (!userMap.has(comm.user_id)) {
        const users = await base44.asServiceRole.entities.AppUser.filter({ id: comm.user_id });
        userMap.set(comm.user_id, users.length > 0 ? users[0] : null);
      }
    }

    // Monta relatório detalhado
    const detail = {
      sale_id: sale.id,
      sale_date: sale.created_date,
      sale_status: sale.status,
      buyer_name: sale.buyer_name,
      product_title: sale.product_title,
      total_amount: sale.total_amount,
      referral_code: sale.referral_code,
      
      commission_records: commissions.map(c => {
        const userData = userMap.get(c.user_id);
        return {
          user_id: c.user_id,
          user_name: userData?.full_name || 'Unknown',
          user_email: userData?.email || 'Unknown',
          role: c.role,
          percent: c.percent,
          amount: c.amount,
          status: c.status
        };
      }),
      
      total_commissions_distributed: commissions.reduce((sum, c) => sum + c.amount, 0),
      total_percent_distributed: commissions.reduce((sum, c) => sum + c.percent, 0),
      
      validation: {
        has_records: commissions.length > 0,
        all_paid: commissions.every(c => c.status === 'paid'),
        total_percent_is_27: Math.abs(commissions.reduce((sum, c) => sum + c.percent, 0) - 27) < 0.01
      }
    };

    return Response.json(detail);
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});