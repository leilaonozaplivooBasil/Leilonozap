import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ error: "URL obrigatória" }, { status: 400 });
        }

        console.log(`🔍 Magazine Luiza (IA): ${productUrl}`);

        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `ACESSE esta página do Magazine Luiza: ${productUrl}

EXTRAIA as URLs DAS IMAGENS DO PRODUTO.

IMPORTANTE:
- Busque URLs que terminam com .jpg ou .jpeg
- URLs do domínio: mlcdn.com.br ou magazineluiza.com.br
- Exemplo: https://a-static.mlcdn.com.br/420x420/apple-iphone-17-256gb-preto-63-48mp-ios-5g/magazineluiza/240586700/2fd4916ee97320e6f600adc8455b6fac.jpg
- COPIE URLs EXATAS da página (mínimo 3, máximo 10)
- NÃO invente URLs

RETORNE em JSON com array "image_urls".`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    image_urls: {
                        type: "array",
                        items: { type: "string" }
                    }
                },
                required: ["image_urls"]
            }
        });

        const imageUrls = result.image_urls || [];

        console.log(`\n📸 IA ENCONTROU ${imageUrls.length} IMAGENS:\n`);
        
        imageUrls.forEach((url, i) => {
            console.log(`  ${i + 1}. ${url}`);
        });

        return Response.json({
            success: true,
            image_urls: imageUrls,
            total: imageUrls.length
        });

    } catch (error) {
        console.error('❌ ERRO:', error);
        return Response.json({
            error: error.message
        }, { status: 500 });
    }
});