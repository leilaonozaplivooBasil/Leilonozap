import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { date } = await req.json();
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Saldo global: soma todas as carteiras
    const digitalWallets = await base44.asServiceRole.entities.DigitalWallet.list();
    const wallets = await base44.asServiceRole.entities.Wallet.list();

    const totalDigitalBalance = digitalWallets.reduce((sum, w) => sum + (w.balance || 0), 0);
    const totalWalletBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
    const globalBalance = totalDigitalBalance + totalWalletBalance;

    // Depósitos creditados hoje
    const digitalDeposits = await base44.asServiceRole.entities.DigitalWalletTransaction.filter({
      direction: 'credit',
      type: 'deposit'
    });

    const walletDeposits = await base44.asServiceRole.entities.WalletTransaction.filter({
      direction: 'credit',
      type: 'deposit'
    });

    const todayDigitalDeposits = digitalDeposits.filter(d => {
      const createdDate = new Date(d.created_date).toISOString().split('T')[0];
      return createdDate === targetDate;
    });

    const todayWalletDeposits = walletDeposits.filter(d => {
      const createdDate = new Date(d.created_date).toISOString().split('T')[0];
      return createdDate === targetDate;
    });

    const totalCreditedToday = 
      todayDigitalDeposits.reduce((sum, t) => sum + (t.amount || 0), 0) +
      todayWalletDeposits.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Uso em vendas hoje (auction_payment)
    const digitalUsage = await base44.asServiceRole.entities.DigitalWalletTransaction.filter({
      direction: 'debit',
      type: 'auction_payment'
    });

    const walletUsage = await base44.asServiceRole.entities.WalletTransaction.filter({
      direction: 'debit',
      type: 'auction_payment'
    });

    const todayDigitalUsage = digitalUsage.filter(d => {
      const createdDate = new Date(d.created_date).toISOString().split('T')[0];
      return createdDate === targetDate;
    });

    const todayWalletUsage = walletUsage.filter(d => {
      const createdDate = new Date(d.created_date).toISOString().split('T')[0];
      return createdDate === targetDate;
    });

    const totalUsedToday = 
      todayDigitalUsage.reduce((sum, t) => sum + (t.amount || 0), 0) +
      todayWalletUsage.reduce((sum, t) => sum + (t.amount || 0), 0);

    return Response.json({
      success: true,
      date: targetDate,
      global_balance: globalBalance,
      breakdown: {
        digital_wallet: totalDigitalBalance,
        commission_wallet: totalWalletBalance
      },
      total_credited_today: totalCreditedToday,
      total_used_today: totalUsedToday,
      deposits_count: todayDigitalDeposits.length + todayWalletDeposits.length,
      usage_count: todayDigitalUsage.length + todayWalletUsage.length
    });

  } catch (error) {
    console.error('Erro getWalletsReconciliation:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});