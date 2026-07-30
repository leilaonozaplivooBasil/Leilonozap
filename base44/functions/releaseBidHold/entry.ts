import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id, auction_id, amount, except_amount, description } = await req.json();

    if (!user_id) {
      return Response.json({ 
        success: false, 
        error: 'user_id é obrigatório' 
      }, { status: 400 });
    }

    // Se amount não informado, libera TODAS as reservas pendentes desse user+auction
    // exceto as com except_amount (usado pra não liberar o lance atual ao liberar anteriores)
    let totalToRelease = 0;
    let holdTransactions: any[] = [];

    if (!amount) {
      // Busca todas as transações bid_hold pending desse user+auction
      const filter: any = { user_id, type: 'bid_hold', status: 'pending' };
      if (auction_id) filter.related_auction_id = auction_id;
      
      holdTransactions = await base44.asServiceRole.entities.DigitalWalletTransaction.filter(filter);
      
      // Filtra transações a excluir (except_amount = valor do lance atual que não deve ser liberado)
      if (typeof except_amount === 'number') {
        holdTransactions = holdTransactions.filter(t => t.amount !== except_amount);
      }
      
      totalToRelease = holdTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    } else {
      totalToRelease = amount;
    }

    if (totalToRelease <= 0) {
      return Response.json({
        success: true,
        released_amount: 0,
        message: 'Nenhuma reserva pendente para liberar'
      });
    }

    // 1. Lê saldos anteriores
    const walletsBefore = await base44.asServiceRole.entities.DigitalWallet.filter({ user_id });
    if (!walletsBefore || walletsBefore.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Carteira não encontrada' 
      }, { status: 400 });
    }
    const previousBalance = walletsBefore.reduce((sum, w) => sum + (w.balance || 0), 0);
    const previousHeld = walletsBefore.reduce((sum, w) => sum + (w.held_balance || 0), 0);

    // 2. LIBERAÇÃO ATÔMICA: move do held_balance de volta pro balance
    await base44.asServiceRole.entities.DigitalWallet.updateMany(
      { user_id, held_balance: { $gte: totalToRelease } },
      { $inc: { held_balance: -totalToRelease, balance: totalToRelease } }
    );

    // 3. Lê saldos novos
    const walletsAfter = await base44.asServiceRole.entities.DigitalWallet.filter({ user_id });
    const newBalance = walletsAfter.reduce((sum, w) => sum + (w.balance || 0), 0);
    const newHeldBalance = walletsAfter.reduce((sum, w) => sum + (w.held_balance || 0), 0);

    // 4. Atualiza as transações bid_hold para status "released"
    if (holdTransactions.length > 0) {
      for (const tx of holdTransactions) {
        try {
          await base44.asServiceRole.entities.DigitalWalletTransaction.update(tx.id, {
            status: 'released'
          });
        } catch (e) {
          console.error('Erro ao atualizar transação para released:', e.message);
        }
      }
    }

    // 5. Registra a transação de liberação
    try {
      await base44.asServiceRole.entities.DigitalWalletTransaction.create({
        user_id: user_id,
        type: 'bid_release',
        direction: 'credit',
        amount: totalToRelease,
        related_auction_id: auction_id || null,
        status: 'confirmed',
        description: description || `Liberação de reserva — lance superado - R$ ${totalToRelease.toFixed(2)}`
      });
    } catch (txError) {
      console.error('Erro ao registrar transação de liberação (liberação já realizada):', txError.message);
    }

    console.log(`🔓 [RELEASE] user=${user_id}, liberado=R$ ${totalToRelease.toFixed(2)}, livre=R$ ${previousBalance.toFixed(2)}→R$ ${newBalance.toFixed(2)}, reservado=R$ ${newHeldBalance.toFixed(2)}`);

    return Response.json({
      success: true,
      previous_balance: previousBalance,
      released_amount: totalToRelease,
      new_balance: newBalance,
      new_held_balance: newHeldBalance,
      wallet_id: walletsAfter[0]?.id
    });

  } catch (error) {
    console.error('Erro releaseBidHold:', error.message);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});