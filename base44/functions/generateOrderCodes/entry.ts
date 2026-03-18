import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Busca todas as vendas
    const allSales = await base44.asServiceRole.entities.Sale.list('-sale_datetime', 10000);
    
    let updated = 0;
    let skipped = 0;

    for (const sale of allSales) {
      // Pula vendas que já têm código
      if (sale.order_code) {
        skipped++;
        continue;
      }

      // Gera código baseado na data da venda
      const saleDate = new Date(sale.sale_datetime || sale.created_date);
      const date = saleDate.toISOString().split('T')[0].replace(/-/g, '');
      const time = saleDate.getTime().toString().slice(-6);
      const orderCode = `PED-${date}-${time}`;

      await base44.asServiceRole.entities.Sale.update(sale.id, {
        order_code: orderCode
      });

      updated++;
      
      // Delay para evitar rate limit
      if (updated % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return Response.json({
      success: true,
      message: `✅ Códigos gerados com sucesso!`,
      updated,
      skipped,
      total: allSales.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});