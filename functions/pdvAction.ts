import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { action, app_user_email, app_user_id } = body;

    // Verifica admin via plataforma ou AppUser
    let isAdmin = false;
    
    try {
      const user = await base44.auth.me();
      if (user && user.role === 'admin') isAdmin = true;
    } catch (e) {
      // Sem token de plataforma, verifica via AppUser
    }

    if (!isAdmin && app_user_email) {
      const appUsers = await base44.asServiceRole.entities.AppUser.filter({ email: app_user_email });
      if (appUsers.length > 0 && appUsers[0].role === 'admin') isAdmin = true;
    }

    if (!isAdmin && app_user_id) {
      const appUsers = await base44.asServiceRole.entities.AppUser.filter({ id: app_user_id });
      if (appUsers.length > 0 && appUsers[0].role === 'admin') isAdmin = true;
    }

    if (!isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // === AÇÕES ===

    if (action === 'openCashRegister') {
      const { operator_name, opening_balance } = body;
      const newRegister = await base44.asServiceRole.entities.CashRegister.create({
        status: 'open',
        operator_name: operator_name || 'Admin',
        opening_time: new Date().toISOString(),
        opening_balance: parseFloat(opening_balance) || 0,
        total_sales: 0, total_pix: 0, total_cash: 0,
        total_debit: 0, total_credit: 0, total_boleto: 0,
        transactions_count: 0
      });
      return Response.json({ success: true, cashRegister: newRegister });
    }

    if (action === 'closeCashRegister') {
      const { register_id, closing_balance, notes, totals } = body;
      await base44.asServiceRole.entities.CashRegister.update(register_id, {
        status: 'closed',
        closing_time: new Date().toISOString(),
        closing_balance: parseFloat(closing_balance) || 0,
        notes: notes || '',
        ...totals
      });
      return Response.json({ success: true });
    }

    if (action === 'createSale') {
      const { sale_data } = body;
      const saleRecord = await base44.asServiceRole.entities.Sale.create(sale_data);
      return Response.json({ success: true, sale: saleRecord });
    }

    if (action === 'createSaleCommission') {
      const { commission_data } = body;
      const commission = await base44.asServiceRole.entities.SaleCommission.create(commission_data);
      return Response.json({ success: true, commission });
    }

    if (action === 'updateProduct') {
      const { product_id, product_data } = body;
      await base44.asServiceRole.entities.Product.update(product_id, product_data);
      return Response.json({ success: true });
    }

    if (action === 'updateSale') {
      const { sale_id, sale_data } = body;
      await base44.asServiceRole.entities.Sale.update(sale_id, sale_data);
      return Response.json({ success: true });
    }

    if (action === 'deleteSale') {
      const { sale_id } = body;
      // Deleta comissões primeiro
      const commissions = await base44.asServiceRole.entities.SaleCommission.filter({ sale_id });
      for (const c of commissions) {
        await base44.asServiceRole.entities.SaleCommission.delete(c.id);
      }
      await base44.asServiceRole.entities.Sale.delete(sale_id);
      return Response.json({ success: true });
    }

    if (action === 'createTaxSettings') {
      const { settings_data } = body;
      const created = await base44.asServiceRole.entities.TaxSettings.create(settings_data);
      return Response.json({ success: true, taxSettings: created });
    }

    if (action === 'getSessionSales') {
      const { opening_time, closing_time } = body;
      const allSales = await base44.asServiceRole.entities.Sale.list('-sale_datetime', 2000);
      const salesInSession = allSales.filter(sale => {
        const saleTime = new Date(sale.sale_datetime).getTime();
        const openTime = new Date(opening_time).getTime();
        const closeTime = closing_time ? new Date(closing_time).getTime() : Date.now();
        return saleTime >= openTime && saleTime <= closeTime;
      });
      return Response.json({ success: true, sales: salesInSession });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    console.error('pdvAction error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});