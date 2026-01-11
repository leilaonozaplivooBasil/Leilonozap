import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
        // Extrai o ID do produto da URL - vários padrões possíveis
        // Padrão 1: /p/MLB12345678 (catálogo)
        // Padrão 2: MLB-12345678 ou MLB12345678 (item direto)
        // Padrão 3: item_id=MLB12345678 na query string
        // Padrão 4: pdp_filters=item_id%3AMLB12345678
        
        let productId = null;
        
        // Tenta extrair do pdp_filters (formato mais comum em URLs de catálogo)
        const filtersMatch = productUrl.match(/item_id[=%3A]+([A-Z]{3}\d+)/i);
        if (filtersMatch) {
            productId = filtersMatch[1].toUpperCase();
            console.log('📦 ID extraído de pdp_filters:', productId);
        }
        
        // Se não achou, tenta padrão direto na URL
        if (!productId) {
            const mlMatch = productUrl.match(/(MLB|MLA|MLU)[- ]?(\d+)/i);
            if (mlMatch) {
                productId = mlMatch[1].toUpperCase() + mlMatch[2];
                console.log('📦 ID extraído da URL:', productId);
            }
        }
        
        // Extrai nome do produto da URL para busca fallback
        const urlParts = productUrl.split('/');
        const productSlug = urlParts.find(p => p.includes('-') && !p.includes('MLB') && !p.includes('MLA') && !p.includes('?') && p.length > 10) || '';
        const searchTerm = productSlug.replace(/-/g, ' ').substring(0, 50);
        console.log('📝 Termo de busca:', searchTerm);
        
        // Se temos um ID, busca diretamente na API de items
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
                            // Converte para resolução máxima (-F é a maior)
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
                console.log('⚠️ API retornou status:', apiResponse.status);
            }
        }

        // Fallback 2: Tenta buscar via API de Search do ML
        console.log('⚠️ APIs diretas falharam, tentando Search API...');
        
        // Usa o termo de busca para encontrar o produto na API de busca
        if (searchTerm && searchTerm.length > 5) {
            const searchApiUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(searchTerm)}&limit=5`;
            console.log('🔍 Buscando:', searchApiUrl);
            
            const searchResponse = await fetch(searchApiUrl);
            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                
                if (searchData.results && searchData.results.length > 0) {
                    // Pega o primeiro resultado que tenha imagens
                    for (const result of searchData.results) {
                        if (result.thumbnail) {
                            // Busca detalhes completos do item
                            const itemDetailUrl = `https://api.mercadolibre.com/items/${result.id}`;
                            const itemResponse = await fetch(itemDetailUrl);
                            
                            if (itemResponse.ok) {
                                const itemData = await itemResponse.json();
                                
                                if (itemData.pictures && itemData.pictures.length > 0) {
                                    const images = itemData.pictures.map(pic => {
                                        const url = pic.secure_url || pic.url;
                                        // Converte para alta resolução
                                        return url.replace(/-[A-Z]\./, '-F.');
                                    });
                                    
                                    console.log('📸 Imagens via Search API:', images.length);
                                    return Response.json({
                                        found: true,
                                        images: [...new Set(images)],
                                        title: itemData.title || result.title || '',
                                        price: itemData.price || result.price || null,
                                        description: itemData.title || result.title || '',
                                        source: 'Mercado Livre'
                                    }, { status: 200 });
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Fallback 3: Usa IA para extrair
        console.log('⚠️ Search API falhou, tentando via IA...');
        const extractResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Acesse esta URL do Mercado Livre e extraia as informações do produto:

URL: ${productUrl}

Extraia:
1. TÍTULO: texto exato do H1
2. PREÇO: valor numérico em reais
3. IMAGENS: URLs das imagens do produto (formato mlstatic.com)

Busque as imagens em:
- Elementos <figure class="ui-pdp-gallery__figure"> com atributo data-zoom
- Ou tags <img> dentro da galeria principal

Retorne APENAS URLs reais que existem na página.`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    price: { type: "number" },
                    image_urls: { type: "array", items: { type: "string" } }
                },
                required: ["title", "image_urls"]
            }
        });

        console.log('🤖 IA retornou:', JSON.stringify(extractResponse));

        if (extractResponse?.image_urls?.length > 0) {
            const validImages = [...new Set(extractResponse.image_urls)].filter(url => 
                url && url.includes('mlstatic.com')
            ).map(url => url.replace(/-[A-Z]\./, '-F.'));
            
            if (validImages.length > 0) {
                console.log('📸 Imagens via IA:', validImages.length);
                return Response.json({
                    found: true,
                    images: validImages,
                    title: extractResponse.title || searchTerm || '',
                    price: extractResponse.price || null,
                    description: extractResponse.title || searchTerm || '',
                    source: 'Mercado Livre'
                }, { status: 200 });
            }
        }

        return Response.json({
            error: "Não foi possível extrair imagens deste anúncio. Tente usar o upload manual de imagens.",
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