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

    if (!callerUser || !callerUser.is_seller) {
      return Response.json({ success: false, error: 'Forbidden: only sellers can request withdrawal' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { amount, pix_key, pix_key_type } = body;

    if (!amount || amount <= 0 || isNaN(amount)) {
      return Response.json({ success: false, error: 'Invalid amount' }, { status: 400 });
    }

    if (!pix_key || pix_key.trim() === '') {
      return Response.json({ success: false, error: 'PIX key required' }, { status: 400 });
    }

    // RECALCULAR SALDO SERVER-SIDE (NUNCA confiar no front)
    const sales = await base44.asServiceRole.entities.CatalogSale.filter({ licensee_id: callerUser.id }, '-payment_confirmed_date', 500);
    const safeSales = Array.isArray(sales) ? sales : [];

    const agora = new Date();
    let saldoLiberadoBruto = 0;

    safeSales.forEach((sale) => {
      if (sale.status === 'paid' && sale.payment_confirmed_date) {
        const dataPgto = new Date(sale.payment_confirmed_date);
        const idadeDias = (agora - dataPgto) / (1000 * 60 * 60 * 24);
        const comissao = (sale.commission_amount && sale.commission_amount > 0)
          ? sale.commission_amount
          : (sale.total_amount * 0.10);
        if (idadeDias >= 7) {
          saldoLiberadoBruto += comissao;
        }
      }
    });

    const withdrawals = await base44.asServiceRole.entities.WithdrawalRequest.filter({ 
      influencer_id: callerUser.id 
    }, '-created_date', 100);
    const safeWithdrawals = Array.isArray(withdrawals) ? withdrawals : [];

    const saquesTotal = safeWithdrawals
      .filter(w => ['pending', 'approved', 'paid'].includes(w.status))
      .reduce((sum, w) => sum + (w.amount || 0), 0);

    const saldoLiberadoFinal = Math.max(0, saldoLiberadoBruto - saquesTotal);

    // BLOQUEAR se amount > saldo
    if (amount > saldoLiberadoFinal) {
      return Response.json({ 
        success: false, 
        error: `Insufficient balance. Available: R$ ${saldoLiberadoFinal.toFixed(2)}` 
      }, { status: 400 });
    }

    // Criar WithdrawalRequest
    const withdrawal = await base44.asServiceRole.entities.WithdrawalRequest.create({
      influencer_id: callerUser.id,
      amount: parseFloat(amount),
      pix_key: pix_key.trim(),
      pix_key_type: pix_key_type || 'CPF',
      recipient_name: callerUser.full_name,
      recipient_document: callerUser.cpf || '',
      status: 'pending',
    });

    return Response.json({
      success: true,
      withdrawal_id: withdrawal.id,
      message: 'Solicitação registrada! Pagamento PIX manual em até 2 dias úteis.',
    });
  } catch (error) {
    console.error('[requestSellerWithdrawal] Erro:', error);
    return Response.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
  }
});