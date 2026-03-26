import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * sendAuctionReminder24h
 * 
 * Chamado pela automação agendada "Leilão — Lembretes 24h"
 * Busca leilões que encerram em ~24h e envia WhatsApp via Brevo
 * para todos os usuários que favoritaram ou participaram
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);

    // Busca leilões que encerram entre agora+23h e agora+24h
    const auctions = await base44.asServiceRole.entities.Auction.filter(
      { status: 'active' },
      '-end_time',
      500
    );

    const auctionsEnding = auctions.filter(a => {
      const endTime = new Date(a.end_time);
      return endTime >= in23h && endTime <= in24h;
    });

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (!BREVO_API_KEY) {
      return Response.json({ error: 'BREVO_API_KEY not set' }, { status: 500 });
    }

    let notified = 0;
    let failed = 0;

    for (const auction of auctionsEnding) {
      // Busca favoritos deste leilão
      const favorites = await base44.asServiceRole.entities.FavoriteAuction.filter({
        auction_id: auction.id
      });

      if (!favorites || favorites.length === 0) continue;

      const formatCurrency = (val) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

      const timeLeft = new Date(auction.end_time).getTime() - now.getTime();
      const hours = Math.round(timeLeft / (60 * 60 * 1000));
      const currentPrice = formatCurrency(auction.current_price || auction.starting_price);
      const auctionTitle = auction.title || 'Leilão';

      // Para cada favorito, envia WhatsApp
      for (const fav of favorites) {
        try {
          const users = await base44.asServiceRole.entities.AppUser.filter({ id: fav.user_id });
          const user = users?.[0];

          if (!user?.phone) continue;

          const rawPhone = user.phone.replace(/\D/g, '');
          const phone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;

          const response = await fetch('https://api.brevo.com/v3/whatsapp/sendMessage', {
            method: 'POST',
            headers: {
              'api-key': BREVO_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sender_number: Deno.env.get('BREVO_WHATSAPP_NUMBER') || '551100000000',
              contact_numbers: [phone],
              text: `⏰ *LEILÃO ENCERANDO EM ${hours}H*\n\n📦 *${auctionTitle}*\n💰 *${currentPrice}*\n\n🔗 Acesse agora: https://leilaonozap.net/AuctionRoom?id=${auction.id}`
            })
          });

          if (response.ok) {
            notified++;
          } else {
            failed++;
          }
        } catch (err) {
          console.warn(`[sendAuctionReminder24h] Erro notificando ${fav.user_id}:`, err.message);
          failed++;
        }
      }
    }

    // Log
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'SEND_AUCTION_REMINDER_24H',
      status: 'success',
      component_name: 'sendAuctionReminder24h',
      message: `Lembretes 24h enviados. Notificados: ${notified}, Falhas: ${failed}. Leilões próximos: ${auctionsEnding.length}`,
      payload: { auctions_ending: auctionsEnding.length, notified, failed }
    });

    return Response.json({
      status: 'success',
      auctions_ending: auctionsEnding.length,
      notified,
      failed
    });

  } catch (error) {
    console.error('[sendAuctionReminder24h] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});