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

        // Fallback: Usa IA se API não funcionar
        console.log('⚠️ API não retornou, tentando via IA...');
        
        const extractResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Acesse esta URL do Mercado Livre e extraia os dados do produto:
${productUrl}

EXTRAIR:
1. TÍTULO: Nome completo do produto
2. PREÇO: Valor numérico em R$
3. IMAGENS: URLs das fotos da galeria do produto

FORMATO DAS URLS DE IMAGEM DO ML:
- Começam com: https://http2.mlstatic.com/D_NQ_NP_
- Terminam com: -F.webp (alta resolução) ou -O.webp (média)
- Contém códigos como MLB, MLA ou MLU

ONDE ENCONTRAR AS IMAGENS:
- Dentro de <figure> com class "ui-pdp-gallery__figure"
- Atributo "data-zoom" das imagens (contém URL HD)
- Atributo "src" das tags <img> principais

⚠️ IMPORTANTE: 
- Copie as URLs EXATAS que aparecem no HTML desta página específica
- NÃO invente URLs - cada produto tem URLs únicas
- Ignore thumbnails pequenas (terminam em -R.webp ou -I.webp)
- Ignore vídeos`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Título do produto" },
                    price: { type: "number", description: "Preço em R$" },
                    image_urls: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "URLs das imagens HD do produto (terminando em -F.webp ou -O.webp)"
                    }
                },
                required: ["title", "image_urls"]
            }
        });

        if (extractResponse?.image_urls?.length > 0) {
            // Remove duplicatas e filtra URLs válidas
            const validImages = [...new Set(extractResponse.image_urls)].filter(url => 
                url && url.includes('mlstatic.com') && (url.includes('-F.') || url.includes('-O.'))
            );
            
            if (validImages.length > 0) {
                console.log('📸 Imagens via IA:', validImages.length);
                return Response.json({
                    found: true,
                    images: validImages,
                    title: extractResponse.title || '',
                    price: extractResponse.price || null,
                    description: extractResponse.title || '',
                    source: 'Mercado Livre'
                }, { status: 200 });
            }
        }

        return Response.json({
            error: "Não foi possível extrair imagens deste anúncio",
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