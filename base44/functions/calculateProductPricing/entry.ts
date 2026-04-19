import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const { product_ids, product_names } = await req.json();

    if (!product_ids && !product_names) {
      return Response.json({ error: 'product_ids or product_names required' }, { status: 400 });
    }

    // Busca produtos
    const allProducts = await base44.entities.Product.list();
    let productsToPrice = [];

    if (product_ids && Array.isArray(product_ids)) {
      productsToPrice = allProducts.filter(p => product_ids.includes(p.id));
    } else if (product_names && Array.isArray(product_names)) {
      productsToPrice = allProducts.filter(p => 
        product_names.some(name => p.description?.toLowerCase().includes(name.toLowerCase()))
      );
    }

    // Limita a 5 por chamada para evitar timeout 504
    productsToPrice = productsToPrice.slice(0, 5);

    if (productsToPrice.length === 0) {
      return Response.json({ 
        products: [],
        message: 'Nenhum produto sem preço encontrado'
      });
    }

    // Busca preço de mercado para cada produto
    const pricedProducts = [];
    for (const product of productsToPrice) {
      try {
        // Chama searchGoogleShopping com o parâmetro correto
        const priceResult = await base44.functions.invoke('searchGoogleShopping', {
          productName: product.description
        });

        const shoppingProducts = priceResult?.data?.products || [];
        // Filtra preços válidos e calcula a mediana
        const validPrices = shoppingProducts
          .map(p => p.price)
          .filter(p => p && p > 0);

        // Captura link do Mercado Livre (primeiro resultado que tiver)
        const mlProduct = shoppingProducts.find(p => p.mercadolivre_url);
        const mlUrl = mlProduct?.mercadolivre_url || null;

        if (validPrices.length > 0) {
          validPrices.sort((a, b) => a - b);
          const mid = Math.floor(validPrices.length / 2);
          const marketPrice = validPrices.length % 2 !== 0
            ? validPrices[mid]
            : (validPrices[mid - 1] + validPrices[mid]) / 2;

          // 🛡️ VALIDAÇÃO DE SANIDADE: rejeita preço absurdo vs custo unitário
          const totalQty = (product.quantity || 0) + (product.quantity_sold || 0);
          const unitCost = totalQty > 0 ? (product.cost_price || 0) / totalQty : (product.cost_price || 0);
          const minAcceptable = unitCost * 2;   // mínimo: custo × 2
          const maxAcceptable = unitCost * 50;  // máximo: custo × 50

          if (unitCost > 0 && (marketPrice < minAcceptable || marketPrice > maxAcceptable)) {
            pricedProducts.push({
              id: product.id,
              description: product.description,
              lot: product.lot,
              market_price: marketPrice,
              unit_cost: unitCost,
              previous_price: product.selling_price_retail || 0,
              previous_market: product.market_value || 0,
              status: 'suspect',
              reason: marketPrice < minAcceptable
                ? `Preço de mercado (R$ ${marketPrice.toFixed(2)}) menor que custo × 2 (R$ ${minAcceptable.toFixed(2)})`
                : `Preço de mercado (R$ ${marketPrice.toFixed(2)}) maior que custo × 50 (R$ ${maxAcceptable.toFixed(2)})`
            });
            continue;
          }

          const calculatedPrice = parseFloat((marketPrice * 0.80).toFixed(2));

          pricedProducts.push({
            id: product.id,
            description: product.description,
            lot: product.lot,
            market_price: marketPrice,
            calculated_price: calculatedPrice,
            selling_price_retail: calculatedPrice,
            previous_price: product.selling_price_retail || 0,
            previous_market: product.market_value || 0,
            source_url: mlUrl,
            status: 'success'
          });
        } else {
          pricedProducts.push({
            id: product.id,
            description: product.description,
            lot: product.lot,
            status: 'no_price_found'
          });
        }
      } catch (error) {
        pricedProducts.push({
          id: product.id,
          description: product.description,
          lot: product.lot,
          status: 'error',
          error: error.message
        });
      }

      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return Response.json({
      products: pricedProducts,
      total: pricedProducts.length,
      success_count: pricedProducts.filter(p => p.status === 'success').length
    });
  } catch (error) {
    console.error('❌ Erro em calculateProductPricing:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});