import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Busca todos os lotes de investimento que têm reserva ativa
    const allLots = await base44.asServiceRole.entities.Auction.filter({ is_investment_plan: true });
    
    const now = new Date();
    let released = 0;
    let keptPaid = 0;

    for (const lot of allLots) {
      if (!lot.reserved_by || !lot.reserved_until) continue;
      
      const expiresAt = new Date(lot.reserved_until);
      if (expiresAt < now) {
        // Antes de liberar, verifica se já existe pagamento confirmado para este lote
        try {
          const payments = await base44.asServiceRole.entities.AsaasPayment.filter(
            { auction_id: lot.id, is_investor_capital: true }
          );
          const hasPaidPayment = payments && payments.some(p => 
            p.status === 'confirmed' || p.status === 'received'
          );

          if (hasPaidPayment) {
            // Pagamento já confirmado — marca como arrematado em vez de liberar
            if (lot.status === 'active') {
              await base44.asServiceRole.entities.Auction.update(lot.id, {
                status: 'sold',
                lot_status: 'pagamento_confirmado',
                reserved_by: null,
                reserved_until: null
              });
              console.log(`✅ Lote ${lot.id} já foi PAGO — marcado como arrematado (não liberado)`);
            }
            keptPaid++;
            continue;
          }
        } catch (checkErr) {
          console.warn(`⚠️ Erro ao verificar pagamento do lote ${lot.id}:`, checkErr.message);
          // Em caso de erro, libera normalmente (segurança)
        }

        // Reserva expirada sem pagamento — libera
        await base44.asServiceRole.entities.Auction.update(lot.id, {
          reserved_by: null,
          reserved_until: null,
          reserved_by_name: null
        });
        console.log(`🔓 Reserva expirada liberada: lote ${lot.id} (era de ${lot.reserved_by_name || lot.reserved_by})`);
        released++;
      }
    }

    console.log(`✅ releaseExpiredReservations: ${released} liberadas, ${keptPaid} mantidas (pagas), ${allLots.length} verificadas`);
    return Response.json({ success: true, released, kept_paid: keptPaid, checked: allLots.length });
  } catch (error) {
    console.error('❌ Erro em releaseExpiredReservations:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});