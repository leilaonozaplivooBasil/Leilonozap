import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function validateImageUrl(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) return false;
        
        const contentType = response.headers.get('content-type');
        return contentType && contentType.startsWith('image/');
    } catch {
        return false;
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ error: "URL obrigatória" }, { status: 400 });
        }

        console.log(`📥 Importando: ${productUrl}`);

        // BUSCA HTML
        let html = '';
        try {
            const resp = await fetch(productUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "text/html"
                },
                signal: AbortSignal.timeout(15000)
            });

            if (resp.ok) {
                html = await resp.text();
                console.log(`✅ ${html.length} chars`);
            }
        } catch (e) {
            return Response.json({
                error: "Página inacessível"
            }, { status: 500 });
        }

        if (!html || html.length < 1000) {
            return Response.json({
                error: "Falha ao carregar página"
            }, { status: 500 });
        }

        // EXTRAI COM IA
        const snippet = html.substring(0, 15000);
        
        const aiResult = await base44.integrations.Core.InvokeLLM({
            prompt: `EXTRAÇÃO COMPLETA DO HTML:

RETORNE:
1. title: Título exato do produto
2. description: Descrição com especificações
3. imageUrls: 8-12 URLs COMPLETAS de imagens GRANDES
4. price: Preço (número)
5. brand: Marca
6. model: Modelo

HTML:
${snippet}

CRÍTICO: imageUrls deve ser um array com URLs diretas (.jpg, .png, .webp)`,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    price: { type: "number" },
                    brand: { type: "string" },
                    model: { type: "string" },
                    imageUrls: { 
                        type: "array", 
                        items: { type: "string" },
                        minItems: 1
                    }
                },
                required: ["title", "description", "imageUrls"]
            }
        });

        const { title, description, imageUrls, price, brand, model } = aiResult;

        console.log(`✅ ${title} | ${imageUrls?.length || 0} imagens`);

        // VALIDA IMAGENS
        const validUrls = [];
        for (const url of imageUrls || []) {
            if (await validateImageUrl(url)) {
                validUrls.push(url);
                console.log(`✅ ${url.substring(0, 60)}`);
            }
            if (validUrls.length >= 8) break;
        }

        console.log(`✅ ${validUrls.length} imagens validadas`);

        return Response.json({
            title,
            description,
            imageUrls: validUrls,
            price: price || null,
            brand: brand || null,
            model: model || null,
            sourceUrl: productUrl
        });

    } catch (error) {
        console.error('❌', error);
        return Response.json({
            error: "Erro ao importar",
            details: error.message
        }, { status: 500 });
    }
});