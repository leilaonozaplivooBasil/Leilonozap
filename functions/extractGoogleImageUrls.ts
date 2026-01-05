import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { googleSearchUrl } = await req.json();
        if (!googleSearchUrl) {
            return Response.json({ error: "URL obrigatória" }, { status: 400 });
        }

        console.log(`🔍 Acessando Google: ${googleSearchUrl}`);

        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `ACESSE esta busca do Google: ${googleSearchUrl}

IDENTIFIQUE e EXTRAIA as URLs das imagens de produtos que aparecem nos resultados.

⚠️ INSTRUÇÕES:
- Procure por imagens de produtos nos resultados
- Copie as URLs DIRETAS das imagens (não links de sites)
- URLs podem ser de diversos domínios (mlcdn.com.br, shoptime.com.br, etc)
- Ignore logos e ícones
- Foque nas imagens principais dos produtos

RETORNE JSON com:
- image_urls: array com URLs das imagens encontradas
- descriptions: breve descrição do que cada imagem mostra`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    image_urls: {
                        type: "array",
                        items: { type: "string" }
                    },
                    descriptions: {
                        type: "array",
                        items: { type: "string" }
                    }
                },
                required: ["image_urls"]
            }
        });

        const imageUrls = result.image_urls || [];
        const descriptions = result.descriptions || [];

        console.log(`\n✅ ENCONTRADAS ${imageUrls.length} IMAGENS:\n`);
        
        imageUrls.forEach((url, i) => {
            console.log(`  ${i + 1}. ${url}`);
            if (descriptions[i]) {
                console.log(`     → ${descriptions[i]}`);
            }
        });

        return Response.json({
            success: true,
            total: imageUrls.length,
            image_urls: imageUrls,
            descriptions: descriptions
        });

    } catch (error) {
        console.error('❌ ERRO:', error);
        return Response.json({
            error: error.message
        }, { status: 500 });
    }
});