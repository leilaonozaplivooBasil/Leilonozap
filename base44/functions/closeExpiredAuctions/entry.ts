import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * closeExpiredAuctions
 * 
 * Busca todos os leilões ativos que já passaram do end_time
 * e invoca a função endAuctionSafe para finalizá-los.
 */

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    console.log(`🕒 [closeExpiredAuctions] Iniciado em: ${new Date().toISOString()}`);

    // 1. Buscar todos os leilões ativos
    const activeAuctions = await base44.asServiceRole.entities.Auction.filter({ 
      status: 'active' 
    });

    const now = new Date();
    const expired = activeAuctions.filter((a: any) => new Date(a.end_time) <= now);

    console.log(`📊 [closeExpiredAuctions] Ativos: ${activeAuctions.length} | Expirados: ${expired.length}`);

    const results: any[] = [];

    for (const auction of expired) {
      console.log(`🔚 [closeExpiredAuctions] Fechando leilão expirado: ${auction.title} (ID: ${auction.id})`);
      
      try {
        // Invoca a função segura de finalização
        const response = await base44.asServiceRole.functions.invoke('endAuctionSafe', { 
          auction_id: auction.id 
        });
        
        results.push({
          id: auction.id,
          title: auction.title,
          status: 'success',
          result: response
        });
      } catch (invokeErr: any) {
        console.error(`❌ [closeExpiredAuctions] Erro ao fechar leilão ${auction.id}:`, invokeErr.message);
        results.push({
          id: auction.id,
          title: auction.title,
          status: 'error',
          error: invokeErr.message
        });
      }
    }

    // 2. Registrar log no SystemLog se houver leilões fechados
    if (results.length > 0) {
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'CLOSE_EXPIRED_AUCTIONS_AUTO',
        status: results.some(r => r.status === 'error') ? 'warning' : 'success',
        component_name: 'closeExpiredAuctions',
        message: `Finalizados ${results.filter(r => r.status === 'success').length}/${expired.length} leilões expirados automaticamente.`,
        payload: { results }
      });
    }

    return Response.json({
      success: true,
      processed: expired.length,
      closed: results.filter(r => r.status === 'success').length,
      errors: results.filter(r => r.status === 'error').length,
      details: results
    });

  } catch (error: any) {
    console.error('❌ [closeExpiredAuctions] Erro fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
