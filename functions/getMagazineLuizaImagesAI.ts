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

EXTRAIA TODAS AS URLs DAS IMAGENS DO PRODUTO (cada miniatura tem uma URL diferente).

IMPORTANTE:
- Cada foto do produto tem um código DIFERENTE no final
- Exemplo: https://a-static.mlcdn.com.br/420x420/.../CODIGO1.jpg
- Exemplo: https://a-static.mlcdn.com.br/420x420/.../CODIGO2.jpg
- URLs terminam com .jpg ou .jpeg
- COPIE URLs DIFERENTES de CADA miniatura visível (mínimo 3, máximo 10)
- NÃO REPITA a mesma URL

RETORNE em JSON com array "image_urls" contendo URLs ÚNICAS.`,
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