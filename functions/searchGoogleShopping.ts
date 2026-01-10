import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productName } = await req.json();

    if (!productName) {
      return Response.json({ error: 'Product name is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SERPAPI_KEY');
    if (!apiKey) {
      return Response.json({ error: 'SerpAPI key not configured' }, { status: 500 });
    }

    // Chama SerpAPI para buscar no Google Shopping
    const serpApiUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(productName)}&location=Brazil&hl=pt&gl=br&api_key=${apiKey}`;

    console.log('🔍 Buscando:', serpApiUrl);

    const response = await fetch(serpApiUrl);
    const data = await response.json();

    console.log('📦 Resposta SerpAPI:', JSON.stringify(data, null, 2));

    if (data.error) {
      console.error('❌ Erro da SerpAPI:', data.error);
      return Response.json({ 
        error: data.error,
        products: [],
        message: 'Erro na API: ' + data.error
      }, { status: 500 });
    }

    if (!data.shopping_results || data.shopping_results.length === 0) {
      console.warn('⚠️ Nenhum resultado encontrado');
      return Response.json({ 
        products: [],
        message: 'Nenhum resultado encontrado',
        debug: {
          hasResults: !!data.shopping_results,
          resultsCount: data.shopping_results?.length || 0
        }
      });
    }

    console.log(`✅ Encontrados ${data.shopping_results.length} resultados`);

    // Formata os resultados
    const products = data.shopping_results.slice(0, 10).map(result => {
      // Extrai o preço de diferentes formatos possíveis
      let price = 0;
      if (result.extracted_price) {
        price = result.extracted_price;
      } else if (result.price) {
        const priceStr = result.price.toString().replace(/[^\d,]/g, '').replace(',', '.');
        price = parseFloat(priceStr) || 0;
      }

      console.log('💰 Produto:', result.title, '- Preço:', price);

      return {
        title: result.title || 'Produto sem título',
        price: price,
        store: result.source || 'Loja não informada',
        url: result.link || '#',
        image: result.thumbnail || null
      };
    });

    return Response.json({ 
      products,
      totalResults: data.shopping_results.length
    });

  } catch (error) {
    console.error('Erro ao buscar no Google Shopping:', error);
    return Response.json({ 
      error: error.message,
      products: []
    }, { status: 500 });
  }
});