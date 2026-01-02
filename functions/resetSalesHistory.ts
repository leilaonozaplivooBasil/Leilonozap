import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Deleta TODAS as vendas da entidade Sale
    const allSales = await base44.asServiceRole.entities.Sale.list('created_date', 5000);
    
    console.log(`🗑️ Deletando ${allSales.length} vendas antigas...`);
    
    for (const sale of allSales) {
      await base44.asServiceRole.entities.Sale.delete(sale.id);
    }

    console.log('✅ Extrato resetado com sucesso!');

    return Response.json({ 
      success: true, 
      message: `${allSales.length} vendas deletadas`,
      deleted_count: allSales.length
    });
  } catch (error) {
    console.error('❌ Erro ao resetar extrato:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});