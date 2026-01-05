import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ error: "URL obrigatória" }, { status: 400 });
        }

        console.log(`🔍 URL: ${productUrl}`);

        // USA IA COM ACESSO À WEB PARA EXTRAIR AS IMAGENS
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `ACESSE esta página do Mercado Livre: ${productUrl}

EXTRAIA as URLs DAS IMAGENS DO PRODUTO.

IMPORTANTE:
- Busque URLs no formato: https://http2.mlstatic.com/D_NQ_NP_2X_CODIGO-MLB...
- Retorne TODAS as URLs encontradas (mínimo 3, máximo 10)
- Copie URLs EXATAS do código HTML
- NÃO invente URLs

RESPONDA em formato JSON com array "image_urls".`,
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
            const codeMatch = url.match(/2X_(\d+)-/);
            const code = codeMatch ? codeMatch[1] : '(sem código)';
            console.log(`  ${i + 1}. [${code}] ${url}`);
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