import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { googleSearchUrl } = await req.json();
        if (!googleSearchUrl) {
            return Response.json({ error: "URL do Google obrigatória" }, { status: 400 });
        }

        console.log(`🔍 Buscando imagens em: ${googleSearchUrl}`);

        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `ACESSE esta busca do Google: ${googleSearchUrl}

EXTRAIA URLs DE IMAGENS DE PRODUTOS (mínimo 5, máximo 10).

BUSQUE:
- Imagens de alta qualidade
- URLs diretas (jpg, png, webp)
- De sites confiáveis (Mercado Livre, Amazon, lojas oficiais)

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

        console.log(`\n📸 ENCONTRADAS ${imageUrls.length} IMAGENS:\n`);
        
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