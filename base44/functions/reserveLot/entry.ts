import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const RESERVATION_MINUTES = 5;

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { auction_id, investor_id, investor_name, action } = body;

    if (!auction_id) {
      return Response.json({ error: 'auction_id é obrigatório' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // === AÇÃO: LIBERAR RESERVA ===
    if (action === 'release') {
      const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });
      if (!auctions || auctions.length === 0) {
        return Response.json({ error: 'Lote não encontrado' }, { status: 404 });
      }
      const auction = auctions[0];

      // Só libera se quem pediu é quem reservou (ou admin)
      if (auction.reserved_by && auction.reserved_by !== investor_id) {
        return Response.json({ error: 'Reserva pertence a outro investidor' }, { status: 403 });
      }

      await base44.asServiceRole.entities.Auction.update(auction_id, {
        reserved_by: null,
        reserved_until: null,
        reserved_by_name: null
      });

      console.log(`🔓 Reserva liberada: lote ${auction_id}`);
      return Response.json({ success: true, action: 'released' });
    }

    // === AÇÃO: RESERVAR LOTE ===
    if (!investor_id) {
      return Response.json({ error: 'investor_id é obrigatório' }, { status: 400 });
    }

    // Busca o lote atual
    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });
    if (!auctions || auctions.length === 0) {
      return Response.json({ error: 'Lote não encontrado' }, { status: 404 });
    }

    const auction = auctions[0];

    // Verifica se o lote está ativo
    if (auction.status !== 'active') {
      return Response.json({ error: 'Lote não está ativo', code: 'NOT_ACTIVE' }, { status: 409 });
    }

    // Verifica se já está reservado por outro investidor (e reserva ainda não expirou)
    if (auction.reserved_by && auction.reserved_by !== investor_id) {
      const now = new Date();
      const reservedUntil = auction.reserved_until ? new Date(auction.reserved_until) : null;

      if (reservedUntil && reservedUntil > now) {
        // Reserva ativa de outro investidor — bloqueia
        console.log(`🚫 Lote ${auction_id} já reservado por ${auction.reserved_by} até ${auction.reserved_until}`);
        return Response.json({
          error: 'Este lote já foi reservado por outro investidor.',
          code: 'ALREADY_RESERVED',
          reserved_until: auction.reserved_until
        }, { status: 409 });
      }

      // Reserva expirada — pode ser sobrescrita
      console.log(`⏰ Reserva expirada de ${auction.reserved_by} — liberando para ${investor_id}`);
    }

    // Se o investidor já é o dono da reserva ativa, renova
    if (auction.reserved_by === investor_id) {
      const reservedUntil = auction.reserved_until ? new Date(auction.reserved_until) : null;
      if (reservedUntil && reservedUntil > new Date()) {
        console.log(`🔄 Reserva já ativa para ${investor_id}, mantendo`);
        return Response.json({
          success: true,
          action: 'already_reserved',
          reserved_until: auction.reserved_until
        });
      }
    }

    // Reserva o lote
    const reservedUntil = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.Auction.update(auction_id, {
      reserved_by: investor_id,
      reserved_until: reservedUntil,
      reserved_by_name: investor_name || null
    });

    console.log(`🔒 Lote ${auction_id} reservado por ${investor_id} (${investor_name}) até ${reservedUntil}`);

    return Response.json({
      success: true,
      action: 'reserved',
      reserved_until: reservedUntil
    });

  } catch (error) {
    console.error('❌ Erro em reserveLot:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});