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
      // Busca caixas abertos ordenados pelo mais recente
      const openRegisters = await base44.asServiceRole.entities.CashRegister.filter(
        { status: 'open' },
        '-opening_time',
        1
      );
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
      const closedSessions = allSessions.filter(s => s.status === 'closed');

      // Recalcula totais de cada sessão baseado nas vendas reais dentro do período
      const allSalesForSessions = await base44.asServiceRole.entities.Sale.list('-sale_datetime', 5000);

      // 🛡️ DEDUPLICAÇÃO: Ordena sessões por opening_time ASC para atribuir cada venda à sessão correta
      // (sessão mais específica = período mais curto que contém a venda)
      const sortedSessions = [...closedSessions].sort((a, b) => 
        new Date(a.opening_time).getTime() - new Date(b.opening_time).getTime()
      );

      // Atribui cada venda a UMA ÚNICA sessão (a com período mais curto que a contém)
      const saleToSessionMap = {};
      allSalesForSessions.forEach(sale => {
        const saleTime = new Date(sale.sale_datetime).getTime();
        let bestSession = null;
        let bestDuration = Infinity;

        sortedSessions.forEach(session => {
          const openTime = new Date(session.opening_time).getTime();
          const closeTime = session.closing_time ? new Date(session.closing_time).getTime() : Date.now();

          if (saleTime >= openTime && saleTime <= closeTime) {
            const duration = closeTime - openTime;
            if (duration < bestDuration) {
              bestDuration = duration;
              bestSession = session.id;
            }
          }
        });

        if (bestSession) {
          saleToSessionMap[sale.id] = bestSession;
        }
      });

      // Agrupa vendas por sessão (sem duplicatas)
      const sessionSalesMap = {};
      allSalesForSessions.forEach(sale => {
        const sessionId = saleToSessionMap[sale.id];
        if (!sessionId) return;
        if (!sessionSalesMap[sessionId]) sessionSalesMap[sessionId] = [];
        sessionSalesMap[sessionId].push(sale);
      });

      result.cashSessions = closedSessions.map(session => {
        const salesInSession = sessionSalesMap[session.id] || [];

        const recalc = { total_pix: 0, total_cash: 0, total_debit: 0, total_credit: 0, total_boleto: 0, total_sales: 0 };
        salesInSession.forEach(sale => {
          const amount = sale.total_amount || 0;
          recalc.total_sales += amount;
          if (sale.payment_method === 'PIX') recalc.total_pix += amount;
          else if (sale.payment_method === 'DINHEIRO') recalc.total_cash += amount;
          else if (sale.payment_method === 'CARTÃO DÉBITO') recalc.total_debit += amount;
          else if (sale.payment_method === 'CARTÃO CRÉDITO') recalc.total_credit += amount;
          else if (sale.payment_method === 'BOLETO PARCELADO') recalc.total_boleto += amount;
        });

        return {
          ...session,
          total_sales: recalc.total_sales,
          total_pix: recalc.total_pix,
          total_cash: recalc.total_cash,
          total_debit: recalc.total_debit,
          total_credit: recalc.total_credit,
          total_boleto: recalc.total_boleto,
          transactions_count: salesInSession.length
        };
      }).sort((a, b) => new Date(b.closing_time) - new Date(a.closing_time));
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