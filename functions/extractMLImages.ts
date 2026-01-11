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
        
        // Extrai também o ID do catálogo (MLB55308774) da URL /p/
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

        // Fallback 2: Tenta buscar via API de Search do ML pelo nome do produto
        console.log('⚠️ API direta falhou, tentando Search API...');
        
        if (searchTerm && searchTerm.length > 5) {
            const searchApiUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(searchTerm)}&limit=3`;
            console.log('🔍 Buscando:', searchApiUrl);
            
            const searchResponse = await fetch(searchApiUrl);
            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                
                if (searchData.results && searchData.results.length > 0) {
                    // Pega o primeiro resultado
                    const firstResult = searchData.results[0];
                    
                    // Busca detalhes completos
                    const itemDetailUrl = `https://api.mercadolibre.com/items/${firstResult.id}`;
                    const itemResponse = await fetch(itemDetailUrl);
                    
                    if (itemResponse.ok) {
                        const itemData = await itemResponse.json();
                        
                        if (itemData.pictures && itemData.pictures.length > 0) {
                            const images = itemData.pictures.map(pic => {
                                const url = pic.secure_url || pic.url;
                                return url.replace(/-[A-Z]\./, '-F.');
                            });
                            
                            console.log('📸 Imagens via Search:', images.length);
                            return Response.json({
                                found: true,
                                images: [...new Set(images)],
                                title: itemData.title || '',
                                price: itemData.price || null,
                                description: itemData.title || '',
                                source: 'Mercado Livre'
                            }, { status: 200 });
                        }
                    }
                }
            }
        }

        return Response.json({
            error: "Não foi possível extrair imagens. O anúncio pode estar bloqueado. Use upload manual.",
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