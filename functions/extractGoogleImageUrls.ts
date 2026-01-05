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
            prompt: `ACESSE: ${googleSearchUrl}

🎯 OBJETIVO: Extrair URLs de IMAGENS (.jpg, .png, .webp) dos produtos exibidos

⚠️ REGRAS OBRIGATÓRIAS:
- COPIE URLs que terminam com .jpg, .jpeg, .png ou .webp
- NÃO retorne links HTML (index.html, pagina.html)
- URLs devem ser de ARQUIVOS DE IMAGEM, não páginas
- Exemplo VÁLIDO: https://a-static.mlcdn.com.br/420x420/produto/abc123.jpg
- Exemplo INVÁLIDO: https://assets.mlcdn.com.br/conteudoproduto/23/238608300/index.html

FORMATOS ACEITOS:
✅ .jpg
✅ .jpeg
✅ .png
✅ .webp

RETORNE apenas URLs de arquivos de imagem reais.`,
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