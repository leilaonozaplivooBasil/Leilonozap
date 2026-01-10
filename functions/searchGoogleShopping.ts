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

    const response = await fetch(serpApiUrl);
    const data = await response.json();

    if (!data.shopping_results || data.shopping_results.length === 0) {
      return Response.json({ 
        products: [],
        message: 'Nenhum resultado encontrado'
      });
    }

    // Formata os resultados
    const products = data.shopping_results.slice(0, 10).map(result => ({
      title: result.title || 'Produto sem título',
      price: result.price ? parseFloat(result.price.replace(/[^\d,]/g, '').replace(',', '.')) : 0,
      store: result.source || 'Loja não informada',
      url: result.link || '#',
      image: result.thumbnail || null
    }));

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