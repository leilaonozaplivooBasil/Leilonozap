import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Busca todos os produtos
    const allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 2000);
    
    if (!allProducts || allProducts.length === 0) {
      return Response.json({ success: true, message: 'Nenhum produto encontrado', grouped: 0, deleted: 0 });
    }

    // Agrupa por lote + descrição
    const grupos = {};
    
    allProducts.forEach(product => {
      const chave = `${product.lot || 'SEM_LOTE'}_${product.description || 'SEM_DESCRICAO'}`;
      
      if (!grupos[chave]) {
        grupos[chave] = [];
      }
      grupos[chave].push(product);
    });

    let gruposProcessados = 0;
    let produtosDeletados = 0;
    let produtosAtualizados = 0;

    // Processa cada grupo
    for (const chave in grupos) {
      const produtosDoGrupo = grupos[chave];
      
      // Se houver apenas 1 produto, não precisa agrupar
      if (produtosDoGrupo.length <= 1) continue;

      gruposProcessados++;

      // Ordena por data de criação (mais antigo primeiro)
      produtosDoGrupo.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

      // O primeiro produto será o "principal" (mantém)
      const produtoPrincipal = produtosDoGrupo[0];

      // Soma quantidades e custos de todos os outros
      let quantidadeTotal = produtoPrincipal.quantity || 0;
      let custoTotal = produtoPrincipal.cost_price || 0;
      let qtyPerfeitoTotal = produtoPrincipal.qty_perfeito || 0;
      let qtyBomTotal = produtoPrincipal.qty_bom || 0;
      let qtyOficinaTotal = produtoPrincipal.qty_oficina || 0;
      let quantidadeVendidaTotal = produtoPrincipal.quantity_sold || 0;
      let soldAmountTotal = produtoPrincipal.sold_amount || 0;
      let profitTotal = produtoPrincipal.profit || 0;

      const produtosParaDeletar = [];

      for (let i = 1; i < produtosDoGrupo.length; i++) {
        const prod = produtosDoGrupo[i];
        quantidadeTotal += (prod.quantity || 0);
        custoTotal += (prod.cost_price || 0);
        qtyPerfeitoTotal += (prod.qty_perfeito || 0);
        qtyBomTotal += (prod.qty_bom || 0);
        qtyOficinaTotal += (prod.qty_oficina || 0);
        quantidadeVendidaTotal += (prod.quantity_sold || 0);
        soldAmountTotal += (prod.sold_amount || 0);
        profitTotal += (prod.profit || 0);
        produtosParaDeletar.push(prod.id);
      }

      // Atualiza o produto principal com valores somados
      await base44.asServiceRole.entities.Product.update(produtoPrincipal.id, {
        quantity: quantidadeTotal,
        cost_price: custoTotal,
        qty_perfeito: qtyPerfeitoTotal,
        qty_bom: qtyBomTotal,
        qty_oficina: qtyOficinaTotal,
        quantity_sold: quantidadeVendidaTotal,
        sold_amount: soldAmountTotal,
        profit: profitTotal
      });
      produtosAtualizados++;

      // Deleta os produtos duplicados
      for (const id of produtosParaDeletar) {
        await base44.asServiceRole.entities.Product.delete(id);
        produtosDeletados++;
      }
    }

    return Response.json({
      success: true,
      message: `Agrupamento concluído com sucesso`,
      grupos_processados: gruposProcessados,
      produtos_atualizados: produtosAtualizados,
      produtos_deletados: produtosDeletados
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});