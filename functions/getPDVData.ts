import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse body uma única vez
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { app_user_email, app_user_id, action } = body;

    // Verifica admin via plataforma OU via AppUser
    let isAdmin = false;

    try {
      const user = await base44.auth.me();
      if (user && user.role === 'admin') isAdmin = true;
    } catch (e) {
      // Sem token de plataforma
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

    const requestAction = action || 'full';
    const result = {};

    if (requestAction === 'full' || requestAction === 'products') {
      const allProducts = await base44.asServiceRole.entities.Product.filter({ status: 'ESTOQUE' });
      result.products = allProducts.filter(p => p.quantity > 0);
    }

    if (requestAction === 'full' || requestAction === 'cashRegister') {
      const openRegisters = await base44.asServiceRole.entities.CashRegister.filter({ status: 'open' });
      result.currentCashRegister = openRegisters.length > 0 ? openRegisters[0] : null;
    }

    if (requestAction === 'full' || requestAction === 'sellers') {
      result.sellers = await base44.asServiceRole.entities.Seller.filter({ is_active: true });
    }

    if (requestAction === 'full' || requestAction === 'taxSettings') {
      const settings = await base44.asServiceRole.entities.TaxSettings.list();
      result.taxSettings = settings.length > 0 ? settings[0] : null;
    }

    if (requestAction === 'full' || requestAction === 'sales') {
      result.allSales = await base44.asServiceRole.entities.Sale.list('-sale_datetime', 5000);
    }

    // DEPÓSITOS DE CARTEIRA (Entradas) - busca única
    if (requestAction === 'full' || requestAction === 'walletDeposits' || requestAction === 'sales') {
      const deposits = await base44.asServiceRole.entities.DigitalWalletTransaction.filter(
        { type: 'deposit', status: 'confirmed' },
        '-created_date',
        500
      );
      result.walletDeposits = deposits;
    }

    if (requestAction === 'full' || requestAction === 'cashSessions') {
      const allSessions = await base44.asServiceRole.entities.CashRegister.list('-closing_time', 500);
      result.cashSessions = allSessions.filter(s => s.status === 'closed');
    }

    if (requestAction === 'full' || requestAction === 'commissions') {
      result.commissions = await base44.asServiceRole.entities.SaleCommission.list();
    }

    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error('getPDVData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});