import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Validar: apenas investment_plan e status=sold
    if (!data || data.is_investment_plan !== true || data.status !== 'sold') {
      return Response.json({ status: 'skipped', reason: 'not_investment_plan_or_sold' });
    }

    const auctionId = event.entity_id;
    const winnerEmail = data.winner_id; // Assumindo que winner_id contém email ou ID do investidor

    if (!winnerEmail) {
      return Response.json({ status: 'error', reason: 'no_winner_identified' }, { status: 400 });
    }

    // Buscar saldo atual do investidor
    const wallet = await base44.asServiceRole.entities.Wallet.filter({ user_id: winnerEmail });
    
    if (!wallet || wallet.length === 0) {
      return Response.json({ status: 'error', reason: 'wallet_not_found' }, { status: 404 });
    }

    const currentWallet = wallet[0];
    const finalBalance = data.current_price || 0;
    
    // Calcular reembolso: saldo_alocado - preço final
    const auctionRecord = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
    const auction = auctionRecord[0];
    
    if (!auction) {
      return Response.json({ status: 'error', reason: 'auction_not_found' }, { status: 404 });
    }

    const refundAmount = auction.saldo_alocado - finalBalance;

    if (refundAmount > 0) {
      // Creditar saldo disponível
      const newBalance = currentWallet.balance + refundAmount;
      await base44.asServiceRole.entities.Wallet.update(currentWallet.id, { balance: newBalance });

      // Registrar transação de reembolso
      await base44.asServiceRole.entities.WalletTransaction.create({
        user_id: winnerEmail,
        type: 'refund',
        direction: 'credit',
        amount: refundAmount,
        related_auction_id: auctionId,
        status: 'confirmed',
        description: `Reembolso de saldo não utilizado do lote: ${auction.title}`
      });
    }

    return Response.json({
      status: 'success',
      auction_id: auctionId,
      winner: winnerEmail,
      refund_amount: refundAmount,
      final_balance: finalBalance
    });

  } catch (error) {
    return Response.json({ 
      status: 'error', 
      message: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});