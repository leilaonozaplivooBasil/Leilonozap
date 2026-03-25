import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Busca todos os lotes de investimento que têm reserva ativa
    const allLots = await base44.asServiceRole.entities.Auction.filter({ is_investment_plan: true });
    
    const now = new Date();
    let released = 0;

    for (const lot of allLots) {
      if (!lot.reserved_by || !lot.reserved_until) continue;
      
      const expiresAt = new Date(lot.reserved_until);
      if (expiresAt < now) {
        // Reserva expirada — libera
        await base44.asServiceRole.entities.Auction.update(lot.id, {
          reserved_by: null,
          reserved_until: null,
          reserved_by_name: null
        });
        console.log(`🔓 Reserva expirada liberada: lote ${lot.id} (era de ${lot.reserved_by_name || lot.reserved_by})`);
        released++;
      }
    }

    console.log(`✅ releaseExpiredReservations: ${released} reservas liberadas de ${allLots.length} lotes verificados`);
    return Response.json({ success: true, released, checked: allLots.length });
  } catch (error) {
    console.error('❌ Erro em releaseExpiredReservations:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});