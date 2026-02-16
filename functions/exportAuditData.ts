import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { start_date, end_date, user_id, requester_email } = body;
    
    console.log('📦 Export request received:', { 
      requester_email, 
      bodyKeys: Object.keys(body),
      fullBody: body 
    });
    
    // Lista de emails autorizados
    const allowedEmails = [
      'erbrito.sistemas@gmail.com', 
      'jonhhenrique29@hotmail.com',
      'luizsantanna@tttcorporate.com'
    ];
    
    console.log('🔐 Checking authorization:', {
      email: requester_email,
      isAllowed: allowedEmails.includes(requester_email),
      allowedEmails
    });
    
    // Validação pelo email
    if (!requester_email || !allowedEmails.includes(requester_email)) {
      console.error('❌ Access denied for:', requester_email);
      return Response.json({ 
        error: `Acesso negado - email '${requester_email}' não autorizado`,
        allowed: allowedEmails
      }, { status: 403 });
    }
    
    console.log('✅ Export approved for:', requester_email);

    // Query com filtros
    let query = {};

    if (start_date) {
      query.created_date = { $gte: start_date };
    }

    if (user_id) {
      query.user_id = user_id;
    }

    // Busca dados para auditoria - SNAPSHOT COMPLETO
    const [commissions, users, catalogSales, products, auctions] = await Promise.all([
      base44.asServiceRole.entities.CommissionRecord.filter(query),
      base44.asServiceRole.entities.AppUser.list(),
      base44.asServiceRole.entities.CatalogSale.filter(
        start_date ? { created_date: { $gte: start_date } } : {}
      ),
      base44.asServiceRole.entities.Product.list(),
      base44.asServiceRole.entities.Auction.filter(
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
        sale_type: c.sale_type,
        status: c.status,
        paid_at: c.paid_at
      })),
      sales: catalogSales.map(s => ({
        id: s.id,
        product_name: s.product_name,
        total_amount: s.total_amount,
        status: s.status,
        buyer_name: s.buyer_name,
        licensee_id: s.licensee_id,
        created_date: s.created_date,
        quantity: s.quantity,
        shipping_cost: s.shipping_cost
      })),
      products: products.map(p => ({
        id: p.id,
        description: p.description,
        price_catalog: p.price_catalog,
        catalog_active: p.catalog_active
      })),
      auctions: auctions.map(a => ({
        id: a.id,
        title: a.title,
        current_price: a.current_price,
        status: a.status,
        winner_id: a.winner_id,
        created_date: a.created_date
      }))
    };

    // Headers para download como arquivo
    return new Response(JSON.stringify(auditData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="audit-snapshot-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error) {
    console.error('Erro ao exportar dados de auditoria:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});