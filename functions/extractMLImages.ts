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

    console.log('🔍 Extraindo imagens do ML via IA:', productUrl);

    try {
        // Usa IA para extrair as imagens WebP do ML
        const extractResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Acesse esta URL do Mercado Livre e extraia TODAS as URLs das imagens do produto:
${productUrl}

INSTRUÇÕES CRÍTICAS:
1. Procure na galeria de imagens do produto (class="ui-pdp-gallery")
2. Extraia APENAS URLs de imagens WebP do domínio http2.mlstatic.com
3. Priorize imagens com sufixo -F.webp (alta resolução) ou -O.webp (média resolução)
4. IGNORE: thumbnails pequenas (-R.webp), vídeos, banners, logos
5. O padrão é: https://http2.mlstatic.com/D_NQ_NP_XXXXXX-MLAXXXXXXXXXX_XXXXXX-F.webp

Também extraia:
- Título completo do produto
- Preço (número decimal)
- Descrição`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Título do produto" },
                    price: { type: "number", description: "Preço em R$" },
                    description: { type: "string", description: "Descrição do produto" },
                    image_urls: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "URLs das imagens WebP de alta resolução (-F.webp ou -O.webp)"
                    }
                },
                required: ["title", "image_urls"]
            }
        });

        console.log('🔍 IA retornou:', JSON.stringify(extractResponse, null, 2));

        if (!extractResponse || !extractResponse.image_urls || extractResponse.image_urls.length === 0) {
            return Response.json({
                error: "IA não conseguiu extrair imagens deste anúncio",
                found: false
            }, { status: 200 });
        }

        // Filtra apenas URLs válidas do ML
        const validImages = extractResponse.image_urls.filter(url => 
            url && 
            url.includes('mlstatic.com') && 
            (url.includes('-F.webp') || url.includes('-O.webp'))
        );

        if (validImages.length === 0) {
            return Response.json({
                error: "Nenhuma imagem válida encontrada",
                found: false
            }, { status: 200 });
        }

        console.log('✅ Imagens extraídas:', validImages.length);

        return Response.json({
            found: true,
            images: validImages,
            title: extractResponse.title || '',
            price: extractResponse.price || null,
            description: extractResponse.description || extractResponse.title || '',
            source: 'Mercado Livre'
        }, { status: 200 });

    } catch (error) {
        console.error('❌ Erro:', error.message);
        return Response.json({
            error: error.message,
            found: false
        }, { status: 200 });
    }
});