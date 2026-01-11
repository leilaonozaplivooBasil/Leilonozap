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
            prompt: `Acesse esta página do Mercado Livre e extraia as URLs REAIS das imagens do produto:
${productUrl}

TAREFA: Copie as URLs EXATAS das imagens de alta resolução da galeria do produto.

ONDE PROCURAR:
- Dentro de <figure class="ui-pdp-gallery__figure">
- Atributo "src" das tags <img> com class="ui-pdp-image ui-pdp-gallery__figure__image"
- OU atributo "data-zoom" (contém URL de alta resolução)

FORMATO DAS URLs REAIS DO ML:
https://http2.mlstatic.com/D_NQ_NP_XXXXXX-MLAXXXXXXXXXX_XXXXXX-F.webp
https://http2.mlstatic.com/D_NQ_NP_XXXXXX-MLUXXXXXXXXXX_XXXXXX-F.webp
https://http2.mlstatic.com/D_NQ_NP_XXXXXX-MLBXXXXXXXXXX_XXXXXX-O.webp

EXEMPLOS DE URLs REAIS (NÃO INVENTAR):
- https://http2.mlstatic.com/D_NQ_NP_670475-MLA99453294496_112025-F.webp
- https://http2.mlstatic.com/D_NQ_NP_829929-MLU76569640662_062024-F.webp

⚠️ CRÍTICO: 
- Copie as URLs EXATAMENTE como aparecem no HTML
- NÃO invente URLs genéricas
- IGNORE thumbnails pequenas (sufixo -R.webp)
- IGNORE vídeos

Também extraia título, preço e descrição.`,
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
                        description: "URLs EXATAS das imagens WebP copiadas do HTML"
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