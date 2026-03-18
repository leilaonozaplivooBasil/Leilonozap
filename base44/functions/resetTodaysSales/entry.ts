import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Data de hoje (13/01/2026)
    const today = '2026-01-13';
    console.log(`🔄 Resetando vendas de ${today}...`);

    // Busca todas as vendas de hoje
    const allSales = await base44.entities.Sale.list('-sale_datetime', 5000);
    const todaysSales = allSales.filter(sale => sale.sale_date === today);

    console.log(`📦 Encontradas ${todaysSales.length} vendas para deletar`);

    // Para cada venda, reverte o produto
    for (const sale of todaysSales) {
      try {
        const products = await base44.entities.Product.filter({ id: sale.product_id });
        if (products.length > 0) {
          const product = products[0];
          
          // Reverte os valores
          const novaQuantidade = (product.quantity || 0) + (sale.quantity_sold || 0);
          const novaQuantidadeVendida = (product.quantity_sold || 0) - (sale.quantity_sold || 0);
          const novoSoldAmount = (product.sold_amount || 0) - (sale.total_amount || 0);
          const novoLucro = (product.profit || 0) - ((sale.net_amount || 0));

          await base44.entities.Product.update(product.id, {
            quantity: novaQuantidade,
            quantity_sold: novaQuantidadeVendida,
            sold_amount: novoSoldAmount,
            profit: novoLucro,
            status: 'ESTOQUE'
          });

          console.log(`✅ Produto ${product.id} revertido`);
        }
      } catch (error) {
        console.error(`Erro ao reverter produto ${sale.product_id}:`, error);
      }
    }

    // Deleta todas as vendas de hoje
    const deleteResult = await base44.entities.Sale.filter({ sale_date: today });
    for (const sale of deleteResult) {
      try {
        // Não há método delete direto, então vamos usar filter e depois deletar
        await base44.asServiceRole.entities.Sale.delete(sale.id);
      } catch (error) {
        console.error(`Erro ao deletar venda ${sale.id}:`, error);
      }
    }

    console.log(`🎉 Reset completo! ${todaysSales.length} vendas deletadas e produtos revertidos`);

    return Response.json({
      success: true,
      message: `✅ ${todaysSales.length} vendas de ${today} foram deletadas e produtos revertidos`,
      salesDeleted: todaysSales.length
    });

  } catch (error) {
    console.error('❌ Erro ao resetar vendas:', error);
    return Response.json({
      error: 'Erro ao resetar vendas',
      details: error.message
    }, { status: 500 });
  }
});