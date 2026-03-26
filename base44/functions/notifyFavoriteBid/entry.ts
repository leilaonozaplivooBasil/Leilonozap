import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * notifyFavoriteBid
 * 
 * Chamado pela automação entity "Bid → create".
 * Para cada novo lance, verifica quais AppUsers favoritaram o leilão
 * e envia WhatsApp via Brevo para cada um deles.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Payload da automação entity: { event, data, old_data }
    const bid = body.data || body;
    const auctionId = bid?.auction_id;

    if (!auctionId) {
      return Response.json({ status: 'skipped', reason: 'no auction_id' });
    }

    // Busca o leilão para pegar título e preço atual
    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
    const auction = auctions?.[0];
    if (!auction) {
      return Response.json({ status: 'skipped', reason: 'auction not found' });
    }

    // Busca todos os favoritos deste leilão
    const favorites = await base44.asServiceRole.entities.FavoriteAuction.filter({ auction_id: auctionId });
    if (!favorites || favorites.length === 0) {
      return Response.json({ status: 'skipped', reason: 'no favorites for this auction' });
    }

    // Coleta IDs únicos de usuários (excluindo quem deu o lance)
    const bidderEmail = bid.created_by;
    const userIds = [...new Set(favorites.map(f => f.user_id))];

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (!BREVO_API_KEY) {
      return Response.json({ error: 'BREVO_API_KEY not set' }, { status: 500 });
    }

    const formatCurrency = (val) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

    const currentPrice = formatCurrency(auction.current_price || auction.starting_price);
    const bidAmount = formatCurrency(bid.amount);
    const auctionTitle = auction.title || 'Leilão';

    let sent = 0;
    let skipped = 0;

    for (const userId of userIds) {
      // Busca dados do usuário
      const users = await base44.asServiceRole.entities.AppUser.filter({ id: userId });
      const user = users?.[0];

      if (!user?.phone) { skipped++; continue; }
      // Não notifica quem deu o lance
      if (user.email === bidderEmail) { skipped++; continue; }

      // Formata número: remove não-dígitos, garante DDI 55
      const rawPhone = user.phone.replace(/\D/g, '');
      const phone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;

      // Envia WhatsApp via Brevo
      const response = await fetch('https://api.brevo.com/v3/whatsapp/sendMessage', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender_number: Deno.env.get('BREVO_WHATSAPP_NUMBER') || '551100000000',
          contact_numbers: [phone],
          text: `🔔 *Novo lance em leilão que você favoritou!*\n\n📦 *${auctionTitle}*\n\n💰 Lance: *${bidAmount}*\n📊 Preço atual: *${currentPrice}*\n\nAcesse o app para acompanhar: https://leilaonozap.net`
        })
      });

      if (response.ok) {
        sent++;
      } else {
        const err = await response.text();
        console.warn(`[notifyFavoriteBid] Falhou para ${phone}:`, err);
        skipped++;
      }
    }

    // Salva log
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'NOTIFY_FAVORITE_BID',
      status: 'success',
      component_name: 'notifyFavoriteBid',
      entity_id: auctionId,
      message: `Lance em "${auctionTitle}" notificado. Enviados: ${sent}, ignorados: ${skipped}.`,
      payload: { auction_id: auctionId, bid_amount: bid.amount, favorites_count: favorites.length, sent, skipped }
    });

    return Response.json({ status: 'success', sent, skipped, favorites: favorites.length });

  } catch (error) {
    console.error('[notifyFavoriteBid] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});