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

        // ============================================
        // MÉTODO 1: Scraping direto do HTML da página
        // ============================================
        console.log('🌐 Tentando scraping direto da página...');
        
        // Limpa a URL removendo parâmetros de tracking
        const cleanUrl = productUrl.split('?')[0];
        
        try {
            const pageResponse = await fetch(cleanUrl, { headers: BROWSER_HEADERS });
            
            if (pageResponse.ok) {
                const html = await pageResponse.text();
                console.log('📄 HTML recebido, tamanho:', html.length);
                
                // Verifica se não é página de login/bloqueio
                if (!html.includes('account-verification-main') && !html.includes('Para continuar, acesse')) {
                    const images = [];
                    let title = '';
                    let price = null;
                    
                    // Extrai título do H1
                    const titleMatch = html.match(/<h1[^>]*class="[^"]*ui-pdp-title[^"]*"[^>]*>([^<]+)<\/h1>/i);
                    if (titleMatch) {
                        title = titleMatch[1].trim();
                        console.log('📝 Título encontrado:', title);
                    }
                    
                    // Extrai preço
                    const priceMatch = html.match(/class="andes-money-amount__fraction"[^>]*>([0-9.]+)<\/span>/);
                    if (priceMatch) {
                        price = parseFloat(priceMatch[1].replace(/\./g, ''));
                        console.log('💰 Preço encontrado:', price);
                    }
                    
                    // MÉTODO A: Extrai do data-zoom nas figures
                    const dataZoomMatches = html.matchAll(/data-zoom="([^"]+)"/g);
                    for (const match of dataZoomMatches) {
                        if (match[1] && match[1].includes('mlstatic.com')) {
                            images.push(match[1]);
                        }
                    }
                    
                    // MÉTODO B: Extrai de src das imagens na galeria
                    const imgMatches = html.matchAll(/ui-pdp-gallery[^>]*>[\s\S]*?<img[^>]+src="([^"]+mlstatic[^"]+)"/g);
                    for (const match of imgMatches) {
                        if (match[1]) {
                            // Converte para alta resolução
                            const hdUrl = match[1].replace(/-[A-Z]\./, '-F.');
                            images.push(hdUrl);
                        }
                    }
                    
                    // MÉTODO C: Busca todas as imagens mlstatic no HTML
                    const allImgMatches = html.matchAll(/https?:\/\/[^"'\s]+mlstatic\.com\/D_[^"'\s]+\.(jpg|jpeg|png|webp)/gi);
                    for (const match of allImgMatches) {
                        if (match[0]) {
                            const hdUrl = match[0].replace(/-[A-Z]\./, '-F.');
                            images.push(hdUrl);
                        }
                    }
                    
                    // MÉTODO D: Extrai do JSON embutido na página
                    const jsonMatch = html.match(/"pictures"\s*:\s*\[([\s\S]*?)\]/);
                    if (jsonMatch) {
                        const urlMatches = jsonMatch[1].matchAll(/"url"\s*:\s*"([^"]+)"/g);
                        for (const m of urlMatches) {
                            if (m[1] && m[1].includes('mlstatic.com')) {
                                const hdUrl = m[1].replace(/-[A-Z]\./, '-F.');
                                images.push(hdUrl);
                            }
                        }
                    }
                    
                    // Remove duplicatas e filtra imagens válidas
                    const uniqueImages = [...new Set(images)].filter(url => 
                        url.includes('mlstatic.com') && 
                        url.includes('/D_') && 
                        !url.includes('thumbnail') &&
                        !url.includes('-I.') // Remove miniaturas
                    );
                    
                    if (uniqueImages.length > 0) {
                        console.log('📸 Imagens via scraping:', uniqueImages.length);
                        return Response.json({
                            found: true,
                            images: uniqueImages,
                            title: title || searchTerm || '',
                            price: price,
                            description: title || searchTerm || '',
                            source: 'Mercado Livre'
                        }, { status: 200 });
                    }
                } else {
                    console.log('⚠️ Página bloqueada/login requerido');
                }
            }
        } catch (scrapeError) {
            console.log('⚠️ Erro no scraping:', scrapeError.message);
        }

        // ============================================
        // MÉTODO 2: APIs do Mercado Livre
        // ============================================
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

        // ============================================
        // MÉTODO 3: SerpAPI - Busca pelo item_id específico do ML
        // ============================================
        console.log('⚠️ APIs do ML bloqueadas, usando SerpAPI...');
        
        const SERPAPI_KEY = Deno.env.get("SERPAPI_KEY");
        if (SERPAPI_KEY && productId) {
            // Busca Google Images pelo item_id específico (MLB...) para pegar imagens do anúncio exato
            const serpUrl = `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(productId + ' site:mercadolivre.com.br')}&hl=pt&gl=br&api_key=${SERPAPI_KEY}`;
            console.log('🔍 Buscando imagens pelo item_id:', productId);
            
            const serpResponse = await fetch(serpUrl);
            if (serpResponse.ok) {
                const serpData = await serpResponse.json();
                
                if (serpData.images_results && serpData.images_results.length > 0) {
                    // Filtra apenas imagens do mlstatic.com (CDN do Mercado Livre)
                    const mlImages = serpData.images_results
                        .filter(img => {
                            const url = img.original || img.thumbnail || '';
                            return url.includes('mlstatic.com') || url.includes('mercadolivre');
                        })
                        .map(img => {
                            let url = img.original || img.thumbnail;
                            // Converte para alta resolução se possível
                            if (url && url.includes('mlstatic.com')) {
                                url = url.replace(/-[A-Z]\./, '-F.');
                            }
                            return url;
                        })
                        .filter(url => url && url.startsWith('http'));
                    
                    if (mlImages.length > 0) {
                        const uniqueImages = [...new Set(mlImages)];
                        console.log('📸 Imagens do anúncio encontradas:', uniqueImages.length);
                        return Response.json({
                            found: true,
                            images: uniqueImages,
                            title: searchTerm || '',
                            price: null,
                            description: searchTerm || '',
                            source: 'Mercado Livre'
                        }, { status: 200 });
                    }
                }
            }
        }
        
        // Fallback: busca pelo nome do produto se não encontrou pelo ID
        if (SERPAPI_KEY && searchTerm) {
            const fallbackUrl = `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(searchTerm + ' mercadolivre')}&hl=pt&gl=br&api_key=${SERPAPI_KEY}`;
            console.log('🔍 Fallback: buscando por nome do produto...');
            
            const fallbackResponse = await fetch(fallbackUrl);
            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                
                if (fallbackData.images_results && fallbackData.images_results.length > 0) {
                    const images = fallbackData.images_results
                        .slice(0, 5)
                        .map(img => img.original || img.thumbnail)
                        .filter(url => url && url.startsWith('http'));
                    
                    if (images.length > 0) {
                        console.log('📸 Imagens via fallback:', images.length);
                        return Response.json({
                            found: true,
                            images: [...new Set(images)],
                            title: searchTerm || '',
                            price: null,
                            description: searchTerm || '',
                            source: 'Google Images'
                        }, { status: 200 });
                    }
                }
            }
        }

        return Response.json({
            error: "Não foi possível extrair imagens. O Mercado Livre está bloqueando requisições externas. Use upload manual de imagens.",
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