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
      const allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 5000); // Força um limite maciço de inventário
      // Na tela do PDV, status não deveria bloquear itens vivos. 
      // Se tiver em estoque quantitativo, ele vai pro PDV.
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
      // Busca todas as vendas — esta é a FONTE DE VERDADE
      const allSalesForSessions = await base44.asServiceRole.entities.Sale.list('-sale_datetime', 5000);

      // Agrupa vendas por sale_date (data real da venda, sem ambiguidade)
      const salesByDate = {};
      allSalesForSessions.forEach(sale => {
        // Usa sale_date (YYYY-MM-DD) como chave canônica
        const dateKey = sale.sale_date || new Date(sale.sale_datetime).toISOString().split('T')[0];
        if (!salesByDate[dateKey]) salesByDate[dateKey] = [];
        salesByDate[dateKey].push(sale);
      });

      // Gera uma "sessão virtual" por dia, ordenada por data decrescente
      const sortedDates = Object.keys(salesByDate).sort((a, b) => b.localeCompare(a));

      result.cashSessions = sortedDates.map(dateKey => {
        const daySales = salesByDate[dateKey];

        // Ordena vendas do dia por horário
        daySales.sort((a, b) => new Date(a.sale_datetime) - new Date(b.sale_datetime));

        const firstSale = daySales[0];
        const lastSale = daySales[daySales.length - 1];

        const recalc = { total_pix: 0, total_cash: 0, total_debit: 0, total_credit: 0, total_boleto: 0, total_sales: 0 };
        daySales.forEach(sale => {
          const amount = sale.total_amount || 0;
          recalc.total_sales += amount;
          if (sale.payment_method === 'PIX') recalc.total_pix += amount;
          else if (sale.payment_method === 'DINHEIRO') recalc.total_cash += amount;
          else if (sale.payment_method === 'CARTÃO DÉBITO') recalc.total_debit += amount;
          else if (sale.payment_method === 'CARTÃO CRÉDITO') recalc.total_credit += amount;
          else if (sale.payment_method === 'BOLETO PARCELADO') recalc.total_boleto += amount;
        });

        return {
          id: `day_${dateKey}`,
          status: 'closed',
          operator_name: 'Vendas do dia',
          opening_time: firstSale.sale_datetime,
          closing_time: lastSale.sale_datetime,
          opening_balance: 0,
          closing_balance: 0,
          notes: '',
          total_sales: recalc.total_sales,
          total_pix: recalc.total_pix,
          total_cash: recalc.total_cash,
          total_debit: recalc.total_debit,
          total_credit: recalc.total_credit,
          total_boleto: recalc.total_boleto,
          transactions_count: daySales.length,
          _sale_date: dateKey
        };
      });
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