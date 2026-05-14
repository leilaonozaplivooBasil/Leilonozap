import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();

    if (!caller?.email) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const callerAppUser = await base44.asServiceRole.entities.AppUser.filter({ email: caller.email });
    const callerUser = callerAppUser?.[0];

    if (!callerUser) {
      return Response.json({ success: false, error: 'User not found' }, { status: 401 });
    }

    // Admin pode consultar qualquer vendedor; vendedor só consulta a si mesmo
    const body = await req.json().catch(() => ({}));
    let sellerId = callerUser.id;
    let isSelfQuery = true;

    if (body.seller_id && callerUser.role === 'admin') {
      sellerId = body.seller_id;
      isSelfQuery = false;
    } else if (body.seller_id && !callerUser.is_seller && callerUser.role !== 'admin') {
      return Response.json({ success: false, error: 'Forbidden: only sellers can query dashboard' }, { status: 403 });
    }

    // Buscar vendedor
    const seller = await base44.asServiceRole.entities.AppUser.get(sellerId).catch(() => null);
    if (!seller || !seller.is_seller) {
      return Response.json({ success: false, error: 'Seller not found or inactive' }, { status: 404 });
    }

    // Buscar TODAS CatalogSale onde licensee_id === sellerId
    const sales = await base44.asServiceRole.entities.CatalogSale.filter({ licensee_id: sellerId }, '-payment_confirmed_date', 500);
    const safeSales = Array.isArray(sales) ? sales : [];

    const agora = new Date();
    let saldoLiberadoBruto = 0;
    let saldoBloqueado = 0;
    const ultimasVendas = [];

    // Processa vendas PAGAS
    safeSales.forEach((sale) => {
      if (sale.status === 'paid' && sale.payment_confirmed_date) {
        const dataPgto = new Date(sale.payment_confirmed_date);
        const idadeDias = (agora - dataPgto) / (1000 * 60 * 60 * 24);

        const comissao = (sale.commission_amount && sale.commission_amount > 0)
          ? sale.commission_amount
          : (sale.total_amount * 0.10);

        const liberada = idadeDias >= 7;
        if (liberada) {
          saldoLiberadoBruto += comissao;
        } else {
          saldoBloqueado += comissao;
        }

        ultimasVendas.push({
          id: sale.id,
          product_title: sale.product_title || 'Produto',
          total_amount: sale.total_amount,
          commission_amount: comissao,
          status: sale.status,
          payment_confirmed_date: sale.payment_confirmed_date,
          liberada_em: new Date(dataPgto.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_liberada: liberada,
        });
      }
    });

    // Buscar saques pendentes (não debitados)
    const withdrawals = await base44.asServiceRole.entities.WithdrawalRequest.filter({ 
      influencer_id: sellerId 
    }, '-created_date', 100);
    const safeWithdrawals = Array.isArray(withdrawals) ? withdrawals : [];

    const saquesTotal = safeWithdrawals
      .filter(w => ['pending', 'approved', 'paid'].includes(w.status))
      .reduce((sum, w) => sum + (w.amount || 0), 0);

    const saldoLiberadoFinal = Math.max(0, saldoLiberadoBruto - saquesTotal);

    // Últimas 10 vendas (ordenadas por data descendente)
    const ultimas10 = ultimasVendas.sort((a, b) => 
      new Date(b.payment_confirmed_date) - new Date(a.payment_confirmed_date)
    ).slice(0, 10);

    // Últimos 10 saques
    const saques10 = safeWithdrawals.slice(0, 10);

    // Total vendas no mês
    const mesPassado = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const vendasMes = safeSales.filter(s => 
      s.status === 'paid' && 
      s.payment_confirmed_date && 
      new Date(s.payment_confirmed_date) >= mesPassado
    );

    return Response.json({
      success: true,
      saldo_liberado_final: saldoLiberadoFinal,
      saldo_bloqueado: saldoBloqueado,
      saldo_liberado_bruto: saldoLiberadoBruto,
      saques_total_pendentes: saquesTotal,
      ultimas_10_vendas: ultimas10,
      saques_recentes: saques10,
      total_vendas_mes: vendasMes.length,
      total_vendido_mes: vendasMes.reduce((sum, s) => sum + (s.total_amount || 0), 0),
    });
  } catch (error) {
    console.error('[getSellerDashboardData] Erro:', error);
    return Response.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
  }
});