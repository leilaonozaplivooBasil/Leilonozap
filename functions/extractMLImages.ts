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
        // Padrões: /p/MLB12345678 ou MLB-12345678
        const mlbMatch = productUrl.match(/MLB[- ]?(\d+)/i);
        
        if (mlbMatch) {
            const productId = 'MLB' + mlbMatch[1];
            console.log('📦 Product ID encontrado:', productId);
            
            // Usa API pública do ML
            const apiUrl = `https://api.mercadolibre.com/items/${productId}`;
            const apiResponse = await fetch(apiUrl);
            
            if (apiResponse.ok) {
                const productData = await apiResponse.json();
                console.log('✅ API ML retornou:', productData.title);
                
                // Extrai imagens de alta resolução
                const images = [];
                if (productData.pictures && productData.pictures.length > 0) {
                    for (const pic of productData.pictures) {
                        // Prioriza URL de maior resolução
                        const imageUrl = pic.secure_url || pic.url;
                        if (imageUrl) {
                            // Converte para resolução máxima (F = Full)
                            const hdUrl = imageUrl.replace(/-[A-Z]\./, '-F.');
                            images.push(hdUrl);
                        }
                    }
                }
                
                if (images.length > 0) {
                    console.log('📸 Imagens encontradas via API:', images.length);
                    return Response.json({
                        found: true,
                        images: images,
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
            prompt: `Acesse ${productUrl} e extraia:
1. Título completo do produto
2. Preço (número)
3. URLs das imagens do produto (formato: https://http2.mlstatic.com/D_NQ_NP_...-F.webp)

Procure as imagens na galeria do produto, pegando os atributos "data-zoom" ou "src" das imagens principais.`,
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

        if (extractResponse?.image_urls?.length > 0) {
            const validImages = extractResponse.image_urls.filter(url => 
                url && url.includes('mlstatic.com')
            );
            
            if (validImages.length > 0) {
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