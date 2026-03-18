import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verifica autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 [AUTO-REACTIVATE] Iniciando verificação de leilões expirados sem lances...');

    // 1. Buscar todos os leilões com status "ended"
    const endedAuctions = await base44.asServiceRole.entities.Auction.filter({ 
      status: 'ended' 
    });

    console.log(`📊 [AUTO-REACTIVATE] Encontrados ${endedAuctions.length} leilões finalizados`);

    let reactivatedCount = 0;
    const reactivatedAuctions = [];

    for (const auction of endedAuctions) {
      // 2. Verificar se o leilão NÃO teve nenhum lance
      // Critério: current_price === starting_price E winner_id === null
      const hasNoWinner = !auction.winner_id || auction.winner_id === null;
      const priceUnchanged = auction.current_price === auction.starting_price;

      if (hasNoWinner && priceUnchanged) {
        console.log(`♻️ [AUTO-REACTIVATE] Reativando leilão: ${auction.title} (ID: ${auction.id})`);

        try {
          // 3. Limpar todos os lances
          const allBids = await base44.asServiceRole.entities.Bid.filter({ 
            auction_id: auction.id 
          });
          
          for (const bid of allBids) {
            await base44.asServiceRole.entities.Bid.delete(bid.id);
          }
          console.log(`   🗑️ Removidos ${allBids.length} lances`);

          // 4. Limpar todas as mensagens
          const allMessages = await base44.asServiceRole.entities.AuctionMessage.filter({ 
            auction_id: auction.id 
          });
          
          for (const msg of allMessages) {
            await base44.asServiceRole.entities.AuctionMessage.delete(msg.id);
          }
          console.log(`   🗑️ Removidas ${allMessages.length} mensagens`);

          // 5. Reativar o leilão por mais 5 dias
          const newEndTime = new Date(Date.now() + (5 * 24 * 60 * 60 * 1000)).toISOString();
          
          await base44.asServiceRole.entities.Auction.update(auction.id, {
            status: 'active',
            end_time: newEndTime,
            current_price: auction.starting_price,
            winner_id: null,
            winner_name: null,
            order_status: null,
            tracking_code: null
          });

          reactivatedCount++;
          reactivatedAuctions.push({
            id: auction.id,
            title: auction.title,
            new_end_time: newEndTime
          });

          console.log(`   ✅ Reativado até: ${newEndTime}`);

        } catch (error) {
          console.error(`   ❌ Erro ao reativar leilão ${auction.id}:`, error.message);
        }
      } else {
        console.log(`   ⏭️ Pulando leilão "${auction.title}" (teve lances ou vencedor)`);
      }
    }

    console.log(`✅ [AUTO-REACTIVATE] Processo concluído: ${reactivatedCount} leilões reativados`);

    return Response.json({
      success: true,
      message: `${reactivatedCount} leilão(ões) reativado(s) automaticamente`,
      reactivatedCount,
      reactivatedAuctions
    });

  } catch (error) {
    console.error('❌ [AUTO-REACTIVATE] Erro:', error);
    return Response.json({ 
      error: error.message || 'Erro ao reativar leilões' 
    }, { status: 500 });
  }
});