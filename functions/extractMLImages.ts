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
            prompt: `Acesse ${productUrl} e extraia TODAS as URLs de imagem da galeria do produto.

TAREFA: Encontrar TODAS as imagens (geralmente 8-12) dentro da galeria.

ONDE PROCURAR:
Na div <div class="ui-pdp-gallery__column">, cada imagem está em:
<figure class="ui-pdp-gallery__figure">
  <img data-zoom="https://http2.mlstatic.com/D_NQ_NP_2X_XXXXXX-MLAXXXXXXXXXX_MMYYYY-F.webp" ...>
</figure>

EXTRAIA o valor do atributo "data-zoom" de CADA <img> dentro de CADA <figure>.

Produto com 10 imagens terá 10 URLs diferentes como:
- https://http2.mlstatic.com/D_NQ_NP_2X_648933-MLA99498284868_112025-F.webp
- https://http2.mlstatic.com/D_NQ_NP_2X_603199-MLA93967786557_102025-F.webp  
- https://http2.mlstatic.com/D_NQ_NP_2X_763958-MLA100186854181_122025-F.webp
- https://http2.mlstatic.com/D_NQ_NP_2X_638884-MLA100187109197_122025-F.webp
- https://http2.mlstatic.com/D_NQ_NP_2X_873462-MLA99701308916_122025-F.webp
- https://http2.mlstatic.com/D_NQ_NP_2X_916799-MLA99701665156_122025-F.webp
- https://http2.mlstatic.com/D_NQ_NP_2X_744293-MLA100187069693_122025-F.webp
- https://http2.mlstatic.com/D_NQ_NP_2X_767998-MLA87471204019_072025-F.webp
- https://http2.mlstatic.com/D_NQ_NP_2X_981499-MLA87145785902_072025-F.webp
- https://http2.mlstatic.com/D_NQ_NP_2X_618630-MLA84353238095_052025-F.webp

Note que CADA URL tem códigos ÚNICOS e DIFERENTES. Extraia TODAS.

Também extraia:
- Título do produto (tag h1)
- Preço (número)`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Título do produto" },
                    price: { type: "number", description: "Preço em R$" },
                    image_urls: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "TODAS as URLs do atributo data-zoom (8-12 imagens)"
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