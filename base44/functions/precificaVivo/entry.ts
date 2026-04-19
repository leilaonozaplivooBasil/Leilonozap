import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * ⚡ PrecificaVivo — Motor de Preço Dinâmico baseado em tráfego real
 * 
 * Lógica:
 * 1. Mede sessões ativas nos últimos 10 min (LiveSession)
 * 2. Se tráfego baixo (<10), economiza créditos SerpAPI
 * 3. Se tráfego alto, seleciona TOP N produtos e atualiza preços
 * 4. Aplica regra: MAX(mercado × 0.80, custo × 1.3) — garante 30% margem mínima
 * 5. Registra cada mudança em PriceHistory (auditoria)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const startedAt = Date.now();

    // 1. MEDE TRÁFEGO ATIVO (últimos 10 min)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const activeSessions = await base44.asServiceRole.entities.LiveSession.filter({
      last_heartbeat: { $gte: tenMinAgo }
    });
    const sessionsCount = activeSessions?.length || 0;

    console.log(`[PrecificaVivo] Sessões ativas: ${sessionsCount}`);

    // 2. MODO ECONÔMICO — tráfego baixo
    if (sessionsCount < 10) {
      return Response.json({
        status: 'economic_mode',
        sessions_active: sessionsCount,
        message: 'Tráfego baixo (<10 pessoas). Economizando créditos SerpAPI.',
        products_updated: 0
      });
    }

    // 3. DEFINE QUANTOS PRODUTOS ATUALIZAR
    let topN;
    if (sessionsCount < 30) topN = 20;
    else if (sessionsCount < 80) topN = 50;
    else topN = 100;

    console.log(`[PrecificaVivo] Atualizando TOP ${topN} produtos`);

    // 4. SELECIONA PRODUTOS ELEGÍVEIS (ativos no catálogo ou leilão, com estoque)
    const allProducts = await base44.asServiceRole.entities.Product.list('-last_dynamic_update', 500);
    const eligible = allProducts.filter(p => {
      const hasStock = (p.quantity || 0) > 0;
      const isActive = p.catalog_active === true || (p.linked_auctions && p.linked_auctions.length > 0);
      const hasCost = (p.cost_price || 0) > 0;
      return hasStock && isActive && hasCost;
    });

    // Prioriza os que NUNCA foram atualizados ou atualizados há mais tempo
    const toUpdate = eligible.slice(0, topN);

    console.log(`[PrecificaVivo] Elegíveis: ${eligible.length} | Selecionados: ${toUpdate.length}`);

    if (toUpdate.length === 0) {
      return Response.json({
        status: 'no_eligible_products',
        sessions_active: sessionsCount,
        message: 'Nenhum produto elegível encontrado (precisa: estoque>0, ativo, custo>0)',
        products_updated: 0
      });
    }

    // 5. ATUALIZA CADA PRODUTO
    const results = {
      updated: 0,
      skipped_small_variation: 0,
      floor_applied: 0,
      errors: 0,
      details: []
    };

    for (const product of toUpdate) {
      try {
        // Busca preço de mercado
        const shoppingRes = await base44.asServiceRole.functions.invoke('searchGoogleShopping', {
          productName: product.description
        });

        const shoppingProducts = shoppingRes?.data?.products || [];
        const validPrices = shoppingProducts
          .map(p => p.price)
          .filter(p => p && p > 0);

        if (validPrices.length === 0) {
          results.errors++;
          continue;
        }

        // Mediana dos preços encontrados
        validPrices.sort((a, b) => a - b);
        const mid = Math.floor(validPrices.length / 2);
        const newMarket = validPrices.length % 2 !== 0
          ? validPrices[mid]
          : (validPrices[mid - 1] + validPrices[mid]) / 2;

        // Calcula custo unitário
        const totalQty = (product.quantity || 0) + (product.quantity_sold || 0);
        const unitCost = totalQty > 0 ? (product.cost_price || 0) / totalQty : (product.cost_price || 0);

        // REGRA: MAX(mercado × 0.80, custo × 1.3)
        const idealPrice = newMarket * 0.80;
        const floorPrice = unitCost * 1.3;
        const floorApplied = floorPrice > idealPrice;
        const newPrice = parseFloat(Math.max(idealPrice, floorPrice).toFixed(2));

        const oldPrice = product.selling_price_retail || 0;
        const variation = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 100;

        // Só aplica se variação > 5%
        if (Math.abs(variation) < 5) {
          results.skipped_small_variation++;
          continue;
        }

        // Captura source_url se ML
        const mlProduct = shoppingProducts.find(p => p.mercadolivre_url);
        const sourceUrl = mlProduct?.mercadolivre_url || null;

        // Atualiza produto
        await base44.asServiceRole.entities.Product.update(product.id, {
          market_value: newMarket,
          selling_price_retail: newPrice,
          last_dynamic_update: new Date().toISOString(),
          ...(sourceUrl && { source_url: sourceUrl })
        });

        // Registra no histórico
        await base44.asServiceRole.entities.PriceHistory.create({
          product_id: product.id,
          product_description: product.description,
          old_price: oldPrice,
          new_price: newPrice,
          old_market: product.market_value || 0,
          new_market: newMarket,
          variation_percent: parseFloat(variation.toFixed(2)),
          trigger_type: 'auto_traffic',
          sessions_active: sessionsCount,
          floor_applied: floorApplied,
          source_url: sourceUrl
        });

        results.updated++;
        if (floorApplied) results.floor_applied++;
        results.details.push({
          product: product.description.substring(0, 50),
          old: oldPrice,
          new: newPrice,
          variation: parseFloat(variation.toFixed(2))
        });

        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        console.error(`[PrecificaVivo] Erro produto ${product.id}:`, err.message);
        results.errors++;
      }
    }

    const duration = Math.round((Date.now() - startedAt) / 1000);

    console.log(`[PrecificaVivo] Finalizado em ${duration}s | Atualizados: ${results.updated}`);

    return Response.json({
      status: 'success',
      sessions_active: sessionsCount,
      top_n: topN,
      duration_seconds: duration,
      products_evaluated: toUpdate.length,
      products_updated: results.updated,
      skipped_small_variation: results.skipped_small_variation,
      floor_applied: results.floor_applied,
      errors: results.errors,
      details: results.details
    });

  } catch (error) {
    console.error('[PrecificaVivo] Erro fatal:', error);
    return Response.json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
});