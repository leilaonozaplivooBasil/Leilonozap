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
        // Extrai o ID do produto da URL
        // Padrões: /p/MLB12345678 ou MLB-12345678 ou MLA/MLU
        const mlMatch = productUrl.match(/(MLB|MLA|MLU)[- ]?(\d+)/i);
        
        // Extrai nome do produto da URL para busca
        const urlParts = productUrl.split('/');
        const productSlug = urlParts.find(p => p.includes('-') && !p.includes('MLB') && !p.includes('MLA') && !p.includes('?') && p.length > 10) || '';
        const searchTerm = productSlug.replace(/-/g, ' ').substring(0, 50);
        console.log('📝 Termo de busca:', searchTerm);
        
        if (mlMatch) {
            const productId = mlMatch[1].toUpperCase() + mlMatch[2];
            console.log('📦 Product ID encontrado:', productId);
            
            // Tenta API de catálogo primeiro (para produtos /p/)
            if (productUrl.includes('/p/')) {
                const catalogId = productId;
                console.log('📦 Tentando API de catálogo para:', catalogId);
                
                // API de catálogo
                const catalogUrl = `https://api.mercadolibre.com/products/${catalogId}`;
                const catalogResponse = await fetch(catalogUrl);
                
                if (catalogResponse.ok) {
                    const catalogData = await catalogResponse.json();
                    console.log('✅ API Catálogo retornou:', catalogData.name);
                    
                    const images = [];
                    if (catalogData.pictures && catalogData.pictures.length > 0) {
                        for (const pic of catalogData.pictures) {
                            const imageUrl = pic.url;
                            if (imageUrl) {
                                // Converte para resolução máxima
                                const hdUrl = imageUrl.replace(/-[A-Z]\./, '-F.');
                                images.push(hdUrl);
                            }
                        }
                    }
                    
                    if (images.length > 0) {
                        console.log('📸 Imagens do catálogo:', images.length);
                        return Response.json({
                            found: true,
                            images: [...new Set(images)], // Remove duplicatas
                            title: catalogData.name || '',
                            price: null,
                            description: catalogData.name || '',
                            source: 'Mercado Livre'
                        }, { status: 200 });
                    }
                }
            }
            
            // Fallback: API de items
            const apiUrl = `https://api.mercadolibre.com/items/${productId}`;
            console.log('📦 Tentando API items:', apiUrl);
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
                    console.log('📸 Imagens via API Items:', images.length);
                    return Response.json({
                        found: true,
                        images: [...new Set(images)],
                        title: productData.title || '',
                        price: productData.price || null,
                        description: productData.title || '',
                        source: 'Mercado Livre'
                    }, { status: 200 });
                }
            }
        }

        // Fallback 2: Usa IA para extrair da página específica
        console.log('⚠️ APIs não retornaram, tentando via IA...');
        console.log('📝 URL original:', productUrl);
        console.log('📝 Termo de busca:', searchTerm);
        
        // Estratégia: Pedir para a IA acessar a URL específica e extrair as imagens
        const extractResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `TAREFA: Acesse esta URL ESPECÍFICA do Mercado Livre e extraia as imagens do produto:

URL: ${productUrl}

INSTRUÇÕES:
1. Acesse a URL acima (página de produto do Mercado Livre)
2. Extraia o TÍTULO exato do produto (tag H1)
3. Extraia o PREÇO em reais (número)
4. Extraia TODAS as URLs de imagens do produto
   - Procure por URLs que contenham "mlstatic.com" ou "http2.mlstatic.com"
   - Busque em elementos <figure>, <img>, ou atributos data-zoom, data-src
   - Formato típico: https://http2.mlstatic.com/D_NQ_NP_...jpg

IMPORTANTE: 
- Acesse a URL ${productUrl} diretamente
- Extraia dados DESTA página específica
- NÃO invente URLs - extraia apenas as que existem na página
- Produto: ${searchTerm}`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Título exato do produto na página" },
                    price: { type: "number", description: "Preço em reais" },
                    image_urls: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "URLs das imagens encontradas na página (mlstatic.com)"
                    }
                },
                required: ["title", "image_urls"]
            }
        });

        console.log('🤖 IA retornou:', JSON.stringify(extractResponse));

        if (extractResponse?.image_urls?.length > 0) {
            // Remove duplicatas e filtra URLs válidas do ML
            const validImages = [...new Set(extractResponse.image_urls)].filter(url => 
                url && (url.includes('mlstatic.com') || url.includes('mercadolibre'))
            ).map(url => {
                // Converte para alta resolução se necessário
                if (url.includes('-I.') || url.includes('-R.') || url.includes('-V.') || url.includes('-O.')) {
                    return url.replace(/-[A-Z]\./, '-F.');
                }
                return url;
            });
            
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

        // Último fallback: tentar extrair pelo nome do produto
        console.log('⚠️ Tentando busca genérica pelo nome...');
        const fallbackResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Busque no Mercado Livre Brasil pelo produto "${searchTerm}" e extraia:
1. Título do produto
2. Preço
3. URLs das imagens (formato mlstatic.com)`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    price: { type: "number" },
                    image_urls: { type: "array", items: { type: "string" } }
                }
            }
        });

        if (fallbackResponse?.image_urls?.length > 0) {
            const fallbackImages = [...new Set(fallbackResponse.image_urls)].filter(url => 
                url && url.includes('mlstatic.com')
            );
            
            if (fallbackImages.length > 0) {
                console.log('📸 Imagens via fallback:', fallbackImages.length);
                return Response.json({
                    found: true,
                    images: fallbackImages,
                    title: fallbackResponse.title || searchTerm || '',
                    price: fallbackResponse.price || null,
                    description: fallbackResponse.title || searchTerm || '',
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