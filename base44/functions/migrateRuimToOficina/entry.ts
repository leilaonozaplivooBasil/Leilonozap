import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Iniciando migração: Ruim → Oficina');

    // Busca todos os produtos
    const allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 5000);
    
    let updated = 0;
    let skipped = 0;

    for (const product of allProducts) {
      const qtyRuim = product.qty_ruim || 0;
      
      if (qtyRuim > 0) {
        const newOficina = (product.qty_oficina || 0) + qtyRuim;
        
        await base44.asServiceRole.entities.Product.update(product.id, {
          qty_oficina: newOficina,
          qty_ruim: 0
        });
        
        console.log(`✅ Produto ${product.description}: ${qtyRuim} ruim → oficina (total oficina: ${newOficina})`);
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`✅ Migração concluída: ${updated} produtos atualizados, ${skipped} já estavam corretos`);

    return Response.json({ 
      success: true,
      message: `Migração concluída com sucesso`,
      updated,
      skipped,
      total: allProducts.length
    });

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});