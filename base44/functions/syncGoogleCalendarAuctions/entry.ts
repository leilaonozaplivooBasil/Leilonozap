import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * syncGoogleCalendarAuctions
 * 
 * Webhook handler: monitora mudanças no Google Calendar
 * Quando um evento no calendário é criado/alterado, sincroniza com os leilões
 * (usado para rastrear confirmações de lembretes por parte do usuário)
 * 
 * Payload vem via create_automation com automation_type="connector", integration_type="googlecalendar"
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Google Calendar webhooks enviam apenas metadados
    const meta = body.data?._provider_meta || {};
    const state = meta['x-goog-resource-state'];

    // 'sync' = confirmação de subscrita inicial
    if (state === 'sync') {
      return Response.json({ status: 'sync_ack' });
    }

    // Obtém o token de acesso do Google Calendar
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('googlecalendar');
      accessToken = conn.accessToken;
    } catch (err) {
      console.error('[syncGoogleCalendarAuctions] Connector não autorizado:', err.message);
      return Response.json({ error: 'connector_not_authorized' }, { status: 401 });
    }

    // Carrega syncToken salvo
    let syncRecord;
    try {
      const records = await base44.asServiceRole.entities.SyncState.list();
      syncRecord = records?.[0];
    } catch (err) {
      console.warn('[syncGoogleCalendarAuctions] SyncState não encontrado, fazendo sync fresh');
    }

    const authHeader = { Authorization: `Bearer ${accessToken}` };
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100';
    if (syncRecord?.sync_token) {
      url += `&syncToken=${encodeURIComponent(syncRecord.sync_token)}`;
    } else {
      url += `&timeMin=${encodeURIComponent(sevenDaysAgo)}`;
    }

    let res = await fetch(url, { headers: authHeader });

    // syncToken expirado (410) - refaz com timeMin
    if (res.status === 410) {
      console.warn('[syncGoogleCalendarAuctions] syncToken expirado, fazendo sync fresh');
      url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&timeMin=${encodeURIComponent(sevenDaysAgo)}`;
      res = await fetch(url, { headers: authHeader });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('[syncGoogleCalendarAuctions] Erro ao buscar eventos:', res.status, errText);
      return Response.json({ error: 'calendar_api_error', status: res.status }, { status: 500 });
    }

    // Acumula todos os eventos (pagination)
    const allItems = [];
    let newSyncToken = null;
    let pageData = await res.json();

    while (true) {
      allItems.push(...(pageData.items || []));
      if (pageData.nextSyncToken) newSyncToken = pageData.nextSyncToken;
      if (!pageData.nextPageToken) break;

      const nextRes = await fetch(
        url + `&pageToken=${encodeURIComponent(pageData.nextPageToken)}`,
        { headers: authHeader }
      );
      if (!nextRes.ok) break;
      pageData = await nextRes.json();
    }

    // Processa eventos - busca por leilões vinculados via externalId
    // (Os eventos criados têm externalId = auction_id)
    let processed = 0;
    for (const event of allItems) {
      const auctionId = event.extendedProperties?.private?.auction_id;
      if (!auctionId) continue;

      // Atualiza o leilão com a informação de que o evento foi confirmado
      try {
        await base44.asServiceRole.entities.Auction.update(auctionId, {
          calendar_event_id: event.id,
          calendar_synced_at: new Date().toISOString()
        });
        processed++;
      } catch (err) {
        console.warn(`[syncGoogleCalendarAuctions] Falha ao atualizar leilão ${auctionId}:`, err.message);
      }
    }

    // Salva novo syncToken
    if (newSyncToken) {
      try {
        if (syncRecord) {
          await base44.asServiceRole.entities.SyncState.update(syncRecord.id, {
            sync_token: newSyncToken,
            last_sync: new Date().toISOString()
          });
        } else {
          await base44.asServiceRole.entities.SyncState.create({
            sync_token: newSyncToken,
            last_sync: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn('[syncGoogleCalendarAuctions] Erro ao salvar syncToken:', err.message);
      }
    }

    return Response.json({
      status: 'success',
      events_processed: processed,
      total_events: allItems.length,
      sync_token_updated: !!newSyncToken
    });

  } catch (error) {
    console.error('[syncGoogleCalendarAuctions] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});