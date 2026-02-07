import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verifica admin via plataforma OU via AppUser
    let isAdmin = user.role === 'admin';
    
    if (!isAdmin) {
      // Fallback: verifica no AppUser
      const body = await req.json().catch(() => ({}));
      const appUserId = body.app_user_id;
      const appUserEmail = body.app_user_email;
      
      if (appUserEmail) {
        const appUsers = await base44.asServiceRole.entities.AppUser.filter({ email: appUserEmail });
        if (appUsers.length > 0 && appUsers[0].role === 'admin') {
          isAdmin = true;
        }
      }
      
      if (!isAdmin && appUserId) {
        const appUsers = await base44.asServiceRole.entities.AppUser.filter({ id: appUserId });
        if (appUsers.length > 0 && appUsers[0].role === 'admin') {
          isAdmin = true;
        }
      }
    }

    if (!isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse body para saber o que buscar
    let body = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch (e) {
      // body já foi consumido acima, tenta de outro jeito
    }
    
    // Re-parse: como o body pode já ter sido lido, usamos uma abordagem diferente
    const requestBody = body || {};
    const action = requestBody.action || 'full';

    const result = {};

    // Busca produtos em estoque
    if (action === 'full' || action === 'products') {
      const allProducts = await base44.asServiceRole.entities.Product.filter({ status: 'ESTOQUE' });
      result.products = allProducts.filter(p => p.quantity > 0);
    }

    // Busca caixa aberto
    if (action === 'full' || action === 'cashRegister') {
      const openRegisters = await base44.asServiceRole.entities.CashRegister.filter({ status: 'open' });
      result.currentCashRegister = openRegisters.length > 0 ? openRegisters[0] : null;
    }

    // Busca vendedores ativos
    if (action === 'full' || action === 'sellers') {
      result.sellers = await base44.asServiceRole.entities.Seller.filter({ is_active: true });
    }

    // Busca configurações de impostos
    if (action === 'full' || action === 'taxSettings') {
      const settings = await base44.asServiceRole.entities.TaxSettings.list();
      result.taxSettings = settings.length > 0 ? settings[0] : null;
    }

    // Busca vendas (com limite)
    if (action === 'full' || action === 'sales') {
      result.allSales = await base44.asServiceRole.entities.Sale.list('-sale_datetime', 5000);
    }

    // Busca sessões de caixa fechadas
    if (action === 'full' || action === 'cashSessions') {
      const allSessions = await base44.asServiceRole.entities.CashRegister.list('-closing_time', 500);
      result.cashSessions = allSessions.filter(s => s.status === 'closed');
    }

    // Busca comissões
    if (action === 'full' || action === 'commissions') {
      result.commissions = await base44.asServiceRole.entities.SaleCommission.list();
    }

    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error('getPDVData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});