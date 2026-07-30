import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas admin pode rodar a migração
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        success: false, 
        error: 'Acesso negado: apenas admin' 
      }, { status: 403 });
    }

    console.log(`🔧 [MIGRATE] Iniciando devolução de saldos retidos em leilões ativos`);

    // 1. Busca TODOS os leilões ativos
    const activeAuctions = await base44.asServiceRole.entities.Auction.filter({ status: 'active' });
    console.log(`📊 [MIGRATE] Leilões ativos: ${activeAuctions.length}`);

    let totalRefunded = 0;
    let usersRefunded = 0;
    const report: any[] = [];

    for (const auction of activeAuctions) {
      const auctionId = auction.id;
      const currentWinnerId = auction.winner_id;

      // 2. Busca todas as transações auction_payment debit relacionadas a esse leilão
      let debitTxs: any[] = [];
      try {
        debitTxs = await base44.asServiceRole.entities.DigitalWalletTransaction.filter({
          related_auction_id: auctionId,
          type: 'auction_payment',
          direction: 'debit',
          status: 'confirmed'
        });
      } catch (e) {
        // Se a coluna related_auction_id não existir ainda, pula
        console.log(`⚠️ [MIGRATE] Não foi possível buscar transações do leilão ${auctionId}: ${e.message}`);
        continue;
      }

      if (debitTxs.length === 0) continue;

      // 3. Agrupa por usuário
      const byUser = new Map<string, any[]>();
      for (const tx of debitTxs) {
        if (!byUser.has(tx.user_id)) byUser.set(tx.user_id, []);
        byUser.get(tx.user_id)!.push(tx);
      }

      for (const [userId, userTxs] of byUser) {
        const userTotal = userTxs.reduce((sum, t) => sum + (t.amount || 0), 0);

        if (userId === currentWinnerId) {
          // Vencedor atual: reembolsa todos os lances EXCETO o maior (que corresponde ao current_price)
          const highestAmount = auction.current_price || 0;
          const winningTx = userTxs.find(t => t.amount === highestAmount);
          const previousTxs = winningTx 
            ? userTxs.filter(t => t.id !== winningTx.id)
            : userTxs;

          const refundAmount = previousTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
          if (refundAmount > 0) {
            // Credita de volta
            await base44.asServiceRole.entities.DigitalWallet.updateMany(
              { user_id: userId },
              { $inc: { balance: refundAmount } }
            );
            totalRefunded += refundAmount;
            usersRefunded++;

            for (const tx of previousTxs) {
              try {
                await base44.asServiceRole.entities.DigitalWalletTransaction.update(tx.id, {
                  status: 'refunded'
                });
              } catch (e) {}
            }

            report.push({
              auction_id: auctionId,
              auction_title: auction.title,
              user_id: userId,
              role: 'winner_previous_bids',
              refunded: refundAmount
            });
          }
        } else {
          // Perdedor: reembolsa TUDO
          if (userTotal > 0) {
            await base44.asServiceRole.entities.DigitalWallet.updateMany(
              { user_id: userId },
              { $inc: { balance: userTotal } }
            );
            totalRefunded += userTotal;
            usersRefunded++;

            for (const tx of userTxs) {
              try {
                await base44.asServiceRole.entities.DigitalWalletTransaction.update(tx.id, {
                  status: 'refunded'
                });
              } catch (e) {}
            }

            report.push({
              auction_id: auctionId,
              auction_title: auction.title,
              user_id: userId,
              role: 'loser',
              refunded: userTotal
            });
          }
        }
      }
    }

    console.log(`✅ [MIGRATE] Concluído: ${usersRefunded} usuários reembolsados, total R$ ${totalRefunded.toFixed(2)}`);

    return Response.json({
      success: true,
      users_refunded: usersRefunded,
      total_refunded: totalRefunded,
      report: report
    });

  } catch (error) {
    console.error('Erro refundStuckBids:', error.message);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});