import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SERPAPI_KEY = Deno.env.get('SERPAPI_KEY');
const BASE_URL = 'https://serpapi.com/search';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productName } = await req.json();

    if (!productName || typeof productName !== 'string' || productName.trim().length === 0) {
      return Response.json({ error: 'productName is required and must be a non-empty string' }, { status: 400 });
    }

    const trimmedName = productName.trim();

    // Chama Google Shopping via SerpAPI
    const googleShoppingUrl = new URL(BASE_URL);
    googleShoppingUrl.searchParams.append('q', trimmedName);
    googleShoppingUrl.searchParams.append('engine', 'google_shopping');
    googleShoppingUrl.searchParams.append('google_domain', 'google.com.br');
    googleShoppingUrl.searchParams.append('gl', 'br');
    googleShoppingUrl.searchParams.append('hl', 'pt-BR');
    googleShoppingUrl.searchParams.append('api_key', SERPAPI_KEY);
    googleShoppingUrl.searchParams.append('num', '20');

    console.log(`🔍 Fetching Google Shopping for: ${trimmedName}`);

    const response = await fetch(googleShoppingUrl.toString());
    const googleShoppingData = await response.json();

    if (!googleShoppingData.shopping_results || googleShoppingData.shopping_results.length === 0) {
      console.log('⚠️ No results from Google Shopping');
      return Response.json({
        status: 'no_results',
        message: 'No products found on Google Shopping'
      });
    }

    // Extrai imagens e preços
    // SerpAPI retorna thumbnail como campo de imagem
    const results = googleShoppingData.shopping_results.map(product => {
      const imageUrl = product.thumbnail || product.image || null;
      const rawPrice = product.extracted_price || product.price;
      let price = null;
      if (rawPrice) {
        if (typeof rawPrice === 'number') {
          price = rawPrice;
        } else {
          price = parseFloat(rawPrice.toString().replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'));
          if (isNaN(price)) price = null;
        }
      }
      return {
        title: product.title || trimmedName,
        price,
        store: product.source || 'Unknown',
        imageUrl,
        productUrl: product.link || product.product_link || null
      };
    }).filter(p => p.imageUrl); // Só retorna com imagem

    if (results.length === 0) {
      console.log('⚠️ No images found in results');
      return Response.json({
        status: 'no_images',
        message: 'Products found but no images available'
      });
    }

    // Calcula preço médio
    const validPrices = results.filter(p => p.price && p.price > 0).map(p => p.price);
    const avgPrice = validPrices.length > 0
      ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length
      : null;

    // Retorna dados estruturados para importação unificada
    return Response.json({
      status: 'success',
      data: {
        productName: trimmedName,
        products: results.slice(0, 12), // Top 12 produtos
        avgPrice: avgPrice ? parseFloat(avgPrice.toFixed(2)) : null,
        minPrice: validPrices.length > 0 ? Math.min(...validPrices) : null,
        maxPrice: validPrices.length > 0 ? Math.max(...validPrices) : null,
        imageCount: results.length
      }
    });

  } catch (error) {
    console.error('❌ Error in extractGoogleShoppingImages:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});