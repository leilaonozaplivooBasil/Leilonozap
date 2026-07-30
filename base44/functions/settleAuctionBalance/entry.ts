import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { auction_id, winner_id, final_price } = await req.json();

    if (!auction_id || !winner_id) {
      return Response.json({ 
        success: false, 
        error: 'auction_id e winner_id são obrigatórios' 
      }, { status: 400 });
    }

    console.log(`🏦 [SETTLE] Iniciando settlement: auction=${auction_id}, winner=${winner_id}, price=R$ ${(final_price || 0).toFixed(2)}`);

    // 1. Busca TODAS as transações bid_hold pending desse leilão
    const holdTransactions = await base44.asServiceRole.entities.DigitalWalletTransaction.filter({
      related_auction_id: auction_id,
      type: 'bid_hold',
      status: 'pending'
    });

    console.log(`📊 [SETTLE] Transações bid_hold pending: ${holdTransactions.length}`);

    let winnerCharged = 0;
    let losersRefunded = 0;
    let totalRefunded = 0;
    let winnerPreviousBidsRefunded = 0;

    // 2. Agrupa transações por usuário
    const byUser = new Map<string, any[]>();
    for (const tx of holdTransactions) {
      if (!byUser.has(tx.user_id)) byUser.set(tx.user_id, []);
      byUser.get(tx.user_id)!.push(tx);
    }

    // 3. Para cada usuário, processa suas reservas
    for (const [userId, userTxs] of byUser) {
      const userTotalHeld = userTxs.reduce((sum, t) => sum + (t.amount || 0), 0);

      if (userId === winner_id) {
        // VENCEDOR: converte a reserva do lance final em débito definitivo
        // e devolve os lances anteriores (se houver)
        
        // Encontra a transação que corresponde ao lance vencedor (amount === final_price)
        const winningTx = userTxs.find(t => t.amount === final_price);
        const previousTxs = winningTx 
          ? userTxs.filter(t => t.id !== winningTx.id)
          : userTxs;

        // 3a. Converte o lance vencedor: tira do held_balance, NÃO devolve pro balance
        if (winningTx) {
          await base44.asServiceRole.entities.DigitalWallet.updateMany(
            { user_id: userId, held_balance: { $gte: winningTx.amount } },
            { $inc: { held_balance: -winningTx.amount } }
          );
          winnerCharged = winningTx.amount;
          
          try {
            await base44.asServiceRole.entities.DigitalWalletTransaction.update(winningTx.id, {
              status: 'settled'
            });
          } catch (e) {
            console.error('Erro ao marcar transação vencedora como settled:', e.message);
          }
        }

        // 3b. Devolve lances anteriores do vencedor
        const previousTotal = previousTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
        if (previousTotal > 0) {
          await base44.asServiceRole.entities.DigitalWallet.updateMany(
            { user_id: userId, held_balance: { $gte: previousTotal } },
            { $inc: { held_balance: -previousTotal, balance: previousTotal } }
          );
          winnerPreviousBidsRefunded = previousTotal;
          totalRefunded += previousTotal;

          for (const tx of previousTxs) {
            try {
              await base44.asServiceRole.entities.DigitalWalletTransaction.update(tx.id, {
                status: 'released'
              });
            } catch (e) {
              console.error('Erro ao marcar transação anterior como released:', e.message);
            }
          }
        }

        console.log(`🏆 [SETTLE] Vencedor ${userId}: cobrado=R$ ${winnerCharged.toFixed(2)}, devolvido=R$ ${winnerPreviousBidsRefunded.toFixed(2)}`);
      } else {
        // PERDEDOR: devolve TODAS as reservas
        if (userTotalHeld > 0) {
          await base44.asServiceRole.entities.DigitalWallet.updateMany(
            { user_id: userId, held_balance: { $gte: userTotalHeld } },
            { $inc: { held_balance: -userTotalHeld, balance: userTotalHeld } }
          );
          losersRefunded++;
          totalRefunded += userTotalHeld;

          for (const tx of userTxs) {
            try {
              await base44.asServiceRole.entities.DigitalWalletTransaction.update(tx.id, {
                status: 'released'
              });
            } catch (e) {
              console.error('Erro ao marcar transação perdedor como released:', e.message);
            }
          }

          console.log(`💸 [SETTLE] Perdedor ${userId}: devolvido=R$ ${userTotalHeld.toFixed(2)}`);
        }
      }
    }

    // 4. Registra a transação de settlement do vencedor
    if (winnerCharged > 0) {
      try {
        await base44.asServiceRole.entities.DigitalWalletTransaction.create({
          user_id: winner_id,
          type: 'auction_settlement',
          direction: 'debit',
          amount: winnerCharged,
          related_auction_id: auction_id,
          status: 'confirmed',
          description: `Arremate confirmado - R$ ${winnerCharged.toFixed(2)}`
        });
      } catch (txError) {
        console.error('Erro ao registrar settlement do vencedor:', txError.message);
      }
    }

    console.log(`✅ [SETTLE] Completo: vencedor cobrado=R$ ${winnerCharged.toFixed(2)}, perdedores reembolsados=${losersRefunded}, total devolvido=R$ ${totalRefunded.toFixed(2)}`);

    return Response.json({
      success: true,
      auction_id,
      winner_id,
      winner_charged: winnerCharged,
      winner_previous_bids_refunded: winnerPreviousBidsRefunded,
      losers_refunded_count: losersRefunded,
      total_refunded: totalRefunded
    });

  } catch (error) {
    console.error('Erro settleAuctionBalance:', error.message);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});