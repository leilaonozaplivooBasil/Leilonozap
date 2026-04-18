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

    // Filtra produtos sem preço
    productsToPrice = productsToPrice.filter(p => !p.selling_price_retail || p.selling_price_retail === 0);

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
        // Chama searchGoogleShopping (já existe no projeto)
        const priceResult = await base44.functions.invoke('searchGoogleShopping', {
          query: product.description
        });

        if (priceResult?.data?.price) {
          const marketPrice = priceResult.data.price;
          const calculatedPrice = marketPrice * 0.80; // 20% desconto

          pricedProducts.push({
            id: product.id,
            description: product.description,
            lot: product.lot,
            market_price: marketPrice,
            calculated_price: calculatedPrice,
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