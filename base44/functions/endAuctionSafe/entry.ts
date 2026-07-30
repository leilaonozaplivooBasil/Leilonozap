import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const GRACE_WINDOW_MS = 50; // 50ms de janela para aceitar lances em trânsito

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // ⚠️ ADMIN-ONLY ou SYSTEM (sem user para scheduled tasks)
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { auction_id } = await req.json();

    if (!auction_id) {
      return Response.json({ 
        success: false, 
        message: 'auction_id é obrigatório' 
      }, { status: 400 });
    }

    console.log(`🔚 [END AUCTION] Iniciando finalização: ${auction_id}`);

    const startTime = Date.now();

    // 1️⃣ BUSCAR LEILÃO
    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });
    
    if (!auctions || auctions.length === 0) {
      return Response.json({ 
        success: false, 
        message: 'Leilão não encontrado' 
      }, { status: 404 });
    }

    const auction = auctions[0];

    // 2️⃣ VERIFICAR SE JÁ ESTÁ FINALIZADO (IDEMPOTÊNCIA)
    if (auction.status === 'ended' || auction.status === 'processing') {
      console.log(`⚠️ [END AUCTION] Leilão já finalizado: ${auction.status}`);
      return Response.json({ 
        success: true, 
        message: 'Leilão já estava finalizado',
        already_ended: true
      }, { status: 200 });
    }

    // 3️⃣ VERIFICAR SE REALMENTE EXPIROU (com janela de graça)
    const now = Date.now();
    const endTime = new Date(auction.end_time).getTime();
    const timeDiff = now - endTime;

    if (timeDiff < -GRACE_WINDOW_MS) {
      console.log(`⚠️ [END AUCTION] Ainda não expirou: ${-timeDiff}ms restantes`);
      return Response.json({ 
        success: false, 
        message: 'Leilão ainda não expirou',
        time_remaining_ms: -timeDiff
      }, { status: 400 });
    }

    // 4️⃣ MARCAR COMO PROCESSING
    await base44.asServiceRole.entities.Auction.update(auction_id, { 
      status: 'processing',
      last_updated: new Date().toISOString()
    });

    console.log(`🔄 [END AUCTION] Status → processing`);

    // ⏳ AGUARDAR JANELA DE GRAÇA (para lances em trânsito)
    if (timeDiff < GRACE_WINDOW_MS) {
      const waitTime = GRACE_WINDOW_MS - timeDiff;
      console.log(`⏱️ [END AUCTION] Aguardando ${waitTime}ms (janela de graça)...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // 5️⃣ BUSCAR ÚLTIMO LANCE (considerando janela de graça)
    const graceWindowTime = new Date(endTime + GRACE_WINDOW_MS);
    
    const allMessages = await base44.asServiceRole.entities.AuctionMessage.filter(
      { auction_id: auction_id, message_type: 'bid' },
      '-created_date',
      100
    );

    // Filtra apenas lances dentro do tempo válido (incluindo janela de graça)
    const validBids = allMessages.filter(msg => {
      const bidTime = new Date(msg.created_date).getTime();
      return bidTime <= graceWindowTime.getTime();
    });

    console.log(`📊 [END AUCTION] Lances válidos: ${validBids.length}`);

    let winnerId = null;
    let winnerName = null;
    let finalPrice = auction.starting_price;

    if (validBids.length > 0) {
      const highestBid = validBids.sort((a, b) => b.bid_amount - a.bid_amount)[0];
      winnerId = highestBid.sender_id;
      winnerName = highestBid.sender_name;
      finalPrice = highestBid.bid_amount;

      console.log(`🏆 [END AUCTION] Vencedor: ${winnerName} - R$ ${finalPrice.toFixed(2)}`);
    } else {
      console.log(`ℹ️ [END AUCTION] Sem lances, leilão finaliza sem vencedor`);
    }

    // 6️⃣ BUSCAR DADOS COMPLETOS DO VENCEDOR (se houver)
    let winnerData = null;
    if (winnerId) {
      try {
        const winners = await base44.asServiceRole.entities.AppUser.filter({ id: winnerId });
        if (winners && winners.length > 0) {
          winnerData = winners[0];
        }
      } catch (error) {
        console.warn(`⚠️ [END AUCTION] Erro ao buscar vencedor:`, error.message);
      }
    }

    // 7️⃣ VERIFICAR SE JÁ EXISTE MENSAGEM DE VITÓRIA (evitar duplicação)
    const existingWinnerMessages = await base44.asServiceRole.entities.AuctionMessage.filter({
      auction_id: auction_id,
      message_type: 'winner_announcement'
    });

    if (existingWinnerMessages.length === 0 && winnerId) {
      // Criar mensagem de vitória
      const productImage = (auction.image_urls && auction.image_urls.length > 0) 
        ? auction.image_urls[0] 
        : 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400';

      const victoryData = {
        winner: winnerData ? {
          id: winnerData.id,
          full_name: winnerData.full_name || '',
          nickname: winnerData.nickname || '',
          email: winnerData.email || '',
          avatar_url: winnerData.avatar_url || null
        } : {
          id: winnerId,
          full_name: winnerName,
          nickname: winnerName,
          email: '',
          avatar_url: null
        },
        auction: {
          id: auction.id,
          title: auction.title || 'Produto',
          image_urls: [productImage],
          current_price: finalPrice,
          starting_price: auction.starting_price || 0
        }
      };

      await base44.asServiceRole.entities.AuctionMessage.create({
        auction_id: auction_id,
        message_type: "winner_announcement",
        content: JSON.stringify(victoryData),
        sender_name: "LanceIA",
        is_system_message: true,
        timestamp: new Date().toISOString()
      });

      console.log(`📢 [END AUCTION] Mensagem de vitória criada!`);
    } else if (existingWinnerMessages.length > 0) {
      console.log(`⚠️ [END AUCTION] Mensagem de vitória já existe, pulando criação`);
    }

    // 7️⃣.5 SETTLEMENT FINANCEIRO — cobra o vencedor e devolve os perdedores
    if (winnerId) {
      try {
        // Settlement financeiro: cobra o vencedor e devolve os perdedores
        // Inline (não chama outra function) — opera direto nas entidades com asServiceRole
        const holdTransactions = await base44.asServiceRole.entities.DigitalWalletTransaction.filter({
          related_auction_id: auction_id,
          type: 'bid_hold',
          status: 'pending'
        });

        console.log(`🏦 [END AUCTION] Transações bid_hold pending: ${holdTransactions.length}`);

        const byUser = new Map<string, any[]>();
        for (const tx of holdTransactions) {
          if (!byUser.has(tx.user_id)) byUser.set(tx.user_id, []);
          byUser.get(tx.user_id)!.push(tx);
        }

        for (const [userId, userTxs] of byUser) {
          const userTotalHeld = userTxs.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

          if (userId === winnerId) {
            const winningTx = userTxs.find((t: any) => t.amount === finalPrice);
            const previousTxs = winningTx ? userTxs.filter((t: any) => t.id !== winningTx.id) : userTxs;

            if (winningTx) {
              await base44.asServiceRole.entities.DigitalWallet.updateMany(
                { user_id: userId, held_balance: { $gte: winningTx.amount } },
                { $inc: { held_balance: -winningTx.amount } }
              );
              try {
                await base44.asServiceRole.entities.DigitalWalletTransaction.update(winningTx.id, { status: 'settled' });
              } catch (e) { console.error('Erro ao marcar tx vencedora como settled:', e.message); }
            }

            const previousTotal = previousTxs.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
            if (previousTotal > 0) {
              await base44.asServiceRole.entities.DigitalWallet.updateMany(
                { user_id: userId, held_balance: { $gte: previousTotal } },
                { $inc: { held_balance: -previousTotal, balance: previousTotal } }
              );
              for (const tx of previousTxs) {
                try { await base44.asServiceRole.entities.DigitalWalletTransaction.update(tx.id, { status: 'released' }); } catch (e) {}
              }
            }
          } else {
            if (userTotalHeld > 0) {
              await base44.asServiceRole.entities.DigitalWallet.updateMany(
                { user_id: userId, held_balance: { $gte: userTotalHeld } },
                { $inc: { held_balance: -userTotalHeld, balance: userTotalHeld } }
              );
              for (const tx of userTxs) {
                try { await base44.asServiceRole.entities.DigitalWalletTransaction.update(tx.id, { status: 'released' }); } catch (e) {}
              }
            }
          }
        }
        console.log(`🏦 [END AUCTION] Settlement concluído`);
      } catch (settleError) {
        console.error(`❌ [END AUCTION] Erro no settlement (leilão será finalizado mesmo assim):`, settleError.message);
      }
    }

    // 8️⃣ PROCESSAR COMISSÃO DO LICENCIADO (se não for plano de investimento)
    if (winnerData && winnerData.referred_by_id && !auction.is_investment_plan) {
      try {
        const licensees = await base44.asServiceRole.entities.AppUser.filter({ 
          id: winnerData.referred_by_id 
        });
        
        if (licensees && licensees.length > 0) {
          const licensee = licensees[0];
          const commission = finalPrice * 0.03;
          const isTestAuction = auction.is_test_auction === true;
          
          console.log(`💰 [END AUCTION] Comissão para ${licensee.full_name}: R$ ${commission.toFixed(2)}`);
          console.log(`🧪 [END AUCTION] Tipo: ${isTestAuction ? 'TESTE' : 'REAL'}`);
          
          if (isTestAuction) {
            await base44.asServiceRole.entities.AppUser.update(licensee.id, {
              network_bids_count: (licensee.network_bids_count || 0) + 1,
              commission_balance: (licensee.commission_balance || 0) + commission,
              test_valora_balance: (licensee.test_valora_balance || 0) + commission,
            });
          } else {
            await base44.asServiceRole.entities.AppUser.update(licensee.id, {
              network_bids_count: (licensee.network_bids_count || 0) + 1,
              commission_balance: (licensee.commission_balance || 0) + commission,
              valora_pay_balance: (licensee.valora_pay_balance || 0) + commission,
            });
          }
          
          console.log(`✅ [END AUCTION] Comissão creditada!`);
        }
      } catch (error) {
        console.error(`❌ [END AUCTION] Erro ao processar comissão:`, error);
      }
    }

    // 9️⃣ ATUALIZAR STATS DO VENCEDOR
    if (winnerData) {
      try {
        await base44.asServiceRole.entities.AppUser.update(winnerId, {
          won_auctions: (winnerData.won_auctions || 0) + 1,
          points: (winnerData.points || 0) + 50
        });
        console.log(`🏆 [END AUCTION] Stats do vencedor atualizados!`);
      } catch (error) {
        console.warn(`⚠️ [END AUCTION] Erro ao atualizar vencedor:`, error.message);
      }
    }

    // 🔟 FINALIZAR LEILÃO
    await base44.asServiceRole.entities.Auction.update(auction_id, {
      status: 'ended',
      winner_id: winnerId,
      winner_name: winnerName,
      current_price: finalPrice,
      order_status: winnerId ? 'awaiting_payment' : null,
      last_updated: new Date().toISOString(),
      version: (auction.version || 0) + 2 // +2 porque já incrementamos uma vez no processing
    });

    console.log(`✅ [END AUCTION] Status → ended`);

    // 1️⃣1️⃣ LOGAR CONCLUSÃO
    const executionTime = Date.now() - startTime;
    
    await base44.asServiceRole.entities.SystemLog.create({
      entity_id: auction_id,
      component_name: 'endAuctionSafe',
      step: 'AUCTION_ENDED',
      status: 'success',
      message: winnerId 
        ? `Leilão finalizado - Vencedor: ${winnerName} - R$ ${finalPrice.toFixed(2)}`
        : 'Leilão finalizado sem lances',
      execution_time_ms: executionTime
    });

    console.log(`🎉 [END AUCTION] FINALIZAÇÃO COMPLETA! (${executionTime}ms)`);

    return Response.json({
      success: true,
      message: 'Leilão finalizado com sucesso',
      winner: winnerId ? {
        id: winnerId,
        name: winnerName,
        price: finalPrice
      } : null,
      execution_time_ms: executionTime
    }, { status: 200 });

  } catch (error) {
    console.error("❌ [END AUCTION] Erro fatal:", error);

    // Tenta logar o erro
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.SystemLog.create({
        component_name: 'endAuctionSafe',
        step: 'FATAL_ERROR',
        status: 'error',
        message: error.message,
        error_details: {
          stack: error.stack,
          name: error.name
        }
      });
    } catch (logError) {
      console.error("❌ Erro ao logar:", logError);
    }

    return Response.json({ 
      success: false, 
      message: 'Erro ao finalizar leilão: ' + error.message 
    }, { status: 500 });
  }
});