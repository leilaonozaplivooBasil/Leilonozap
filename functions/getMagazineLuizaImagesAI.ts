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
            prompt: `ACESSE: ${productUrl}

PASSO 1: AGUARDE a página carregar completamente
PASSO 2: LOCALIZE as miniaturas de fotos do produto (geralmente 3-10 miniaturas clicáveis)
PASSO 3: COPIE a URL de CADA miniatura do código HTML

⚠️ REGRAS CRÍTICAS:
- COPIE URLs que existem no HTML (não invente padrões)
- Cada miniatura tem um CÓDIGO ÚNICO no final: /2fd4916e.jpg, /abc123.jpg, etc
- URLs do domínio: mlcdn.com.br ou magazineluiza.com.br
- Exemplo REAL: https://a-static.mlcdn.com.br/420x420/apple-iphone-17.../2fd4916ee97320e6f600adc8455b6fac.jpg
- TODAS as URLs devem ser DIFERENTES (códigos únicos)
- NÃO crie URLs com padrões -1.jpg, -2.jpg (isso é inventar!)

RETORNE JSON com array "image_urls" contendo URLs REAIS do HTML.`,
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