import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Valida autenticação
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    console.log('🔄 Iniciando correção de produtos de lotes...');

    // Busca todos os lotes
    const allBatches = await base44.entities.BatchRegistration.list('-created_date', 1000);
    console.log(`📦 ${allBatches.length} lotes encontrados`);

    // Cria mapa de lotes por número
    const batchMap = new Map();
    allBatches.forEach(batch => {
      batchMap.set(batch.lote, batch);
    });

    // Busca todos os produtos
    const allProducts = await base44.entities.Product.list('-created_date', 1000);
    console.log(`📦 ${allProducts.length} produtos encontrados`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const product of allProducts) {
      // Pula produtos sem lote
      if (!product.lot) {
        skippedCount++;
        continue;
      }

      // Busca o lote correspondente
      const batch = batchMap.get(product.lot);
      if (!batch) {
        console.log(`⚠️ Lote ${product.lot} não encontrado para produto ${product.id}`);
        skippedCount++;
        continue;
      }

      // Atualiza o produto
      try {
        const valorUnitario = batch.custo_por_unidade || 0;
        const custoProporcional = valorUnitario * (product.quantity || 1);
        
        await base44.entities.Product.update(product.id, {
          cost_price: custoProporcional,
          selling_price_retail: valorUnitario
        });

        updatedCount++;
        console.log(`✅ Produto ${product.id} atualizado (Lote ${product.lot})`);

        // Delay para evitar rate limit
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Erro ao atualizar produto ${product.id}:`, error);
      }
    }

    console.log(`✅ Atualização concluída: ${updatedCount} atualizados, ${skippedCount} pulados`);

    return Response.json({
      success: true,
      updated: updatedCount,
      skipped: skippedCount,
      total: allProducts.length
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});