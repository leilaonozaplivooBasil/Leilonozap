import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Headers para simular navegador real
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
};

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        await base44.auth.me();
    } catch (authError) {
        return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    let productUrl;
    try {
        const body = await req.json();
        productUrl = body.productUrl;
    } catch (parseError) {
        return Response.json({ error: 'JSON inválido' }, { status: 400 });
    }
    
    if (!productUrl || !productUrl.includes('mercadolivre.com.br')) {
        return Response.json({ 
            error: "URL do Mercado Livre obrigatória",
            found: false 
        }, { status: 400 });
    }

    console.log('🔍 Extraindo imagens do ML:', productUrl);

    try {
        // Extrai IDs da URL
        let productId = null;
        
        // Padrão pdp_filters=item_id%3AMLB...
        const filtersMatch = productUrl.match(/item_id[=%3A]+([A-Z]{3}\d+)/i);
        if (filtersMatch) {
            productId = filtersMatch[1].toUpperCase();
            console.log('📦 ID extraído de pdp_filters:', productId);
        }
        
        // Padrão direto MLB-123 ou MLB123
        if (!productId) {
            const mlMatch = productUrl.match(/(MLB|MLA|MLU)[- ]?(\d+)/i);
            if (mlMatch) {
                productId = mlMatch[1].toUpperCase() + mlMatch[2];
                console.log('📦 ID extraído da URL:', productId);
            }
        }
        
        // Extrai nome do produto para fallback
        const urlParts = productUrl.split('/');
        const productSlug = urlParts.find(p => p.includes('-') && !p.includes('MLB') && !p.includes('MLA') && !p.includes('?') && p.length > 10) || '';
        const searchTerm = productSlug.replace(/-/g, ' ').substring(0, 50);
        console.log('📝 Termo de busca:', searchTerm);
        
        // Extrai ID do catálogo (/p/MLB...)
        const catalogMatch = productUrl.match(/\/p\/([A-Z]{3}\d+)/i);
        const catalogId = catalogMatch ? catalogMatch[1].toUpperCase() : null;
        console.log('📦 Catalog ID:', catalogId, '| Item ID:', productId);

        // Tenta API de catálogo primeiro (mais confiável para produtos /p/)
        if (catalogId) {
            const catalogApiUrl = `https://api.mercadolibre.com/products/${catalogId}`;
            console.log('📦 Buscando catálogo:', catalogApiUrl);
            const catalogResponse = await fetch(catalogApiUrl);
            
            if (catalogResponse.ok) {
                const catalogData = await catalogResponse.json();
                console.log('✅ API Catálogo retornou:', catalogData.name);
                
                const images = [];
                if (catalogData.pictures && catalogData.pictures.length > 0) {
                    for (const pic of catalogData.pictures) {
                        const imageUrl = pic.url;
                        if (imageUrl) {
                            const hdUrl = imageUrl.replace(/-[A-Z]\./, '-F.');
                            images.push(hdUrl);
                        }
                    }
                }
                
                if (images.length > 0) {
                    console.log('📸 Imagens do catálogo:', images.length);
                    return Response.json({
                        found: true,
                        images: [...new Set(images)],
                        title: catalogData.name || '',
                        price: null,
                        description: catalogData.name || '',
                        source: 'Mercado Livre'
                    }, { status: 200 });
                }
            } else {
                console.log('⚠️ API Catálogo retornou status:', catalogResponse.status);
            }
        }
        
        // Se temos um ID de item, busca diretamente na API de items
        if (productId) {
            const apiUrl = `https://api.mercadolibre.com/items/${productId}`;
            console.log('📦 Buscando item:', apiUrl);
            const apiResponse = await fetch(apiUrl);
            
            if (apiResponse.ok) {
                const productData = await apiResponse.json();
                console.log('✅ API Items retornou:', productData.title);
                
                const images = [];
                if (productData.pictures && productData.pictures.length > 0) {
                    for (const pic of productData.pictures) {
                        const imageUrl = pic.secure_url || pic.url;
                        if (imageUrl) {
                            const hdUrl = imageUrl.replace(/-[A-Z]\./, '-F.');
                            images.push(hdUrl);
                        }
                    }
                }
                
                if (images.length > 0) {
                    console.log('📸 Imagens encontradas:', images.length);
                    return Response.json({
                        found: true,
                        images: [...new Set(images)],
                        title: productData.title || '',
                        price: productData.price || null,
                        description: productData.title || '',
                        source: 'Mercado Livre'
                    }, { status: 200 });
                }
            } else {
                console.log('⚠️ API Items retornou status:', apiResponse.status);
            }
        }

        // Fallback 2: Usa SerpAPI para buscar imagens via Google Shopping
        console.log('⚠️ APIs do ML bloqueadas, usando SerpAPI...');
        
        const SERPAPI_KEY = Deno.env.get("SERPAPI_KEY");
        if (SERPAPI_KEY && searchTerm) {
            const serpUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(searchTerm + ' mercado livre')}&location=Brazil&hl=pt&gl=br&api_key=${SERPAPI_KEY}`;
            console.log('🔍 Buscando via SerpAPI...');
            
            const serpResponse = await fetch(serpUrl);
            if (serpResponse.ok) {
                const serpData = await serpResponse.json();
                
                if (serpData.shopping_results && serpData.shopping_results.length > 0) {
                    // Procura resultado do Mercado Livre
                    const mlResult = serpData.shopping_results.find(r => 
                        r.source && r.source.toLowerCase().includes('mercado')
                    ) || serpData.shopping_results[0];
                    
                    if (mlResult) {
                        const images = [];
                        
                        // Pega thumbnail e tenta converter para HD
                        if (mlResult.thumbnail) {
                            images.push(mlResult.thumbnail);
                        }
                        
                        // Se tem product_id, busca mais detalhes
                        if (mlResult.product_id) {
                            const detailUrl = `https://serpapi.com/search.json?engine=google_product&product_id=${mlResult.product_id}&location=Brazil&hl=pt&gl=br&api_key=${SERPAPI_KEY}`;
                            const detailResponse = await fetch(detailUrl);
                            
                            if (detailResponse.ok) {
                                const detailData = await detailResponse.json();
                                
                                // Extrai imagens do produto
                                if (detailData.product_results?.media) {
                                    for (const media of detailData.product_results.media) {
                                        if (media.type === 'image' && media.link) {
                                            images.push(media.link);
                                        }
                                    }
                                }
                            }
                        }
                        
                        if (images.length > 0) {
                            console.log('📸 Imagens via SerpAPI:', images.length);
                            return Response.json({
                                found: true,
                                images: [...new Set(images)],
                                title: mlResult.title || searchTerm || '',
                                price: mlResult.extracted_price || null,
                                description: mlResult.title || searchTerm || '',
                                source: 'Mercado Livre'
                            }, { status: 200 });
                        }
                    }
                }
            }
        }

        return Response.json({
            error: "Não foi possível extrair imagens. As APIs do Mercado Livre estão bloqueando requisições. Use upload manual.",
            found: false
        }, { status: 200 });

    } catch (error) {
        console.error('❌ Erro:', error.message);
        return Response.json({
            error: error.message,
            found: false
        }, { status: 200 });
    }
});