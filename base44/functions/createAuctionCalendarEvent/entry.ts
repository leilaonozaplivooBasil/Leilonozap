import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * createAuctionCalendarEvent
 * 
 * Chamado pela automação entity "Auction → create"
 * Cria um evento no Google Calendar para o leilão
 * com lembretes automáticos 24h, 12h, 1h e 30min antes do encerramento
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const auction = body.data || body;

    const auctionId = auction?.id;
    const endTime = auction?.end_time;

    if (!auctionId || !endTime) {
      return Response.json({ status: 'skipped', reason: 'missing auction_id or end_time' });
    }

    // Obtém token do Google Calendar
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('googlecalendar');
      accessToken = conn.accessToken;
    } catch (err) {
      console.warn('[createAuctionCalendarEvent] Google Calendar não autorizado');
      return Response.json({ status: 'skipped', reason: 'google_calendar_not_authorized' });
    }

    const startTime = new Date(endTime);
    startTime.setHours(startTime.getHours() - 1); // Evento começa 1h antes

    const event = {
      summary: `🔨 Leilão: ${auction.title || 'Novo Leilão'}`,
      description: `Leilão encerra em: ${new Date(endTime).toLocaleString('pt-BR')}\n\nURL: https://leilaonozap.net/AuctionRoom?id=${auctionId}`,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'notification', minutes: 1440 }, // 24h
          { method: 'notification', minutes: 720 },  // 12h
          { method: 'notification', minutes: 60 },   // 1h
          { method: 'notification', minutes: 30 }    // 30min
        ]
      },
      extendedProperties: {
        private: {
          auction_id: auctionId,
          leilao_nozap: 'true'
        }
      }
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[createAuctionCalendarEvent] Erro ao criar evento:', response.status, err);
      return Response.json({ error: 'calendar_api_error' }, { status: 500 });
    }

    const createdEvent = await response.json();

    // Atualiza o leilão com o ID do evento do Google Calendar
    await base44.asServiceRole.entities.Auction.update(auctionId, {
      calendar_event_id: createdEvent.id,
      calendar_synced_at: new Date().toISOString()
    });

    // Log de sucesso
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'CREATE_AUCTION_CALENDAR_EVENT',
      status: 'success',
      component_name: 'createAuctionCalendarEvent',
      entity_id: auctionId,
      message: `Evento do Google Calendar criado para leilão "${auction.title || 'N/A'}" com lembretes 24h, 12h, 1h e 30min.`,
      payload: { auction_id: auctionId, calendar_event_id: createdEvent.id, end_time: endTime }
    });

    return Response.json({
      status: 'success',
      calendar_event_id: createdEvent.id,
      auction_id: auctionId
    });

  } catch (error) {
    console.error('[createAuctionCalendarEvent] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});