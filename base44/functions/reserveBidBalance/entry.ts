import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id, amount, auction_id, bid_message_id, description } = await req.json();

    if (!user_id || !amount || amount <= 0) {
      return Response.json({ 
        success: false, 
        error: 'user_id e amount (>0) são obrigatórios' 
      }, { status: 400 });
    }

    // 1. Lê saldo anterior (para resposta e verificação)
    const walletsBefore = await base44.asServiceRole.entities.DigitalWallet.filter({ user_id });
    if (!walletsBefore || walletsBefore.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Carteira não encontrada', 
        balance: 0 
      }, { status: 400 });
    }
    const previousBalance = walletsBefore.reduce((sum, w) => sum + (w.balance || 0), 0);

    // 2. RESERVA ATÔMICA: move do balance pro held_balance
    // Débito do balance (só se balance >= amount)
    await base44.asServiceRole.entities.DigitalWallet.updateMany(
      { user_id, balance: { $gte: amount } },
      { $inc: { balance: -amount, held_balance: amount } }
    );

    // 3. Lê saldo novo para confirmar
    const walletsAfter = await base44.asServiceRole.entities.DigitalWallet.filter({ user_id });
    const newBalance = walletsAfter.reduce((sum, w) => sum + (w.balance || 0), 0);
    const newHeldBalance = walletsAfter.reduce((sum, w) => sum + (w.held_balance || 0), 0);

    // 4. Se o saldo livre não diminuiu, a reserva falhou (saldo insuficiente)
    if (newBalance >= previousBalance) {
      return Response.json({
        success: false,
        error: 'Saldo insuficiente',
        balance: newBalance,
        required: amount,
        deficit: amount - newBalance
      }, { status: 400 });
    }

    // 5. Registra a transação de reserva
    try {
      await base44.asServiceRole.entities.DigitalWalletTransaction.create({
        user_id: user_id,
        type: 'bid_hold',
        direction: 'debit',
        amount: amount,
        related_auction_id: auction_id || null,
        related_message_id: bid_message_id || null,
        status: 'pending',
        description: description || `Reserva de lance - R$ ${amount.toFixed(2)}`
      });
    } catch (txError) {
      console.error('Erro ao registrar transação de reserva (reserva já realizada):', txError.message);
    }

    console.log(`🔒 [RESERVE] user=${user_id}, valor=R$ ${amount.toFixed(2)}, livre=R$ ${previousBalance.toFixed(2)}→R$ ${newBalance.toFixed(2)}, reservado=R$ ${newHeldBalance.toFixed(2)}`);

    return Response.json({
      success: true,
      previous_balance: previousBalance,
      reserved: amount,
      new_balance: newBalance,
      new_held_balance: newHeldBalance,
      wallet_id: walletsAfter[0]?.id
    });

  } catch (error) {
    console.error('Erro reserveBidBalance:', error.message);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});