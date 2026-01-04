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

        // DETECTA MARKETPLACE
        const url = productUrl.toLowerCase();
        const isMercadoLivre = url.includes('mercadolivre') || url.includes('mercadolibre');
        
        console.log(`🏪 Marketplace: ${isMercadoLivre ? 'Mercado Livre' : 'Genérico'}`);
        
        // EXTRAI IMAGENS COM REGEX (PRIORITÁRIO)
        let extractedImages = [];
        
        if (isMercadoLivre) {
            console.log('🔍 Usando regex Mercado Livre...');
            const regex = /https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[A-Za-z0-9_-]+\.(?:jpg|webp)/gi;
            const matches = html.match(regex) || [];
            extractedImages = [...new Set(matches)].filter(u => !u.includes('-O.jpg') && !u.includes('-I.jpg'));
            console.log(`📸 Regex encontrou: ${extractedImages.length} URLs`);
        } else if (url.includes('amazon')) {
            const regex = /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_-]+\.(?:jpg|png)/gi;
            extractedImages = [...new Set(html.match(regex) || [])];
            console.log(`📸 Amazon regex: ${extractedImages.length} URLs`);
        } else if (url.includes('shopee')) {
            const regex = /https:\/\/cf\.shopee\.com\.br\/file\/[A-Za-z0-9_-]+/gi;
            extractedImages = [...new Set(html.match(regex) || [])];
            console.log(`📸 Shopee regex: ${extractedImages.length} URLs`);
        }
        
        // EXTRAI DADOS COM IA (título, descrição, preço)
        const snippet = html.substring(0, 15000);
        
        const aiResult = await base44.integrations.Core.InvokeLLM({
            prompt: `EXTRAÇÃO DO HTML DO PRODUTO:

HTML:
${snippet}

RETORNE JSON:
1. title: Título completo do produto
2. description: Descrição detalhada com especificações técnicas
3. price: Preço numérico (apenas números, ex: 2999.90)
4. brand: Marca do produto (se identificável)
5. model: Modelo específico (se identificável)

⚠️ NÃO precisa extrair URLs de imagens, isso já foi feito.`,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    price: { type: "number" },
                    brand: { type: "string" },
                    model: { type: "string" }
                },
                required: ["title", "description"]
            }
        });
        
        // PRIORIZA IMAGENS DO REGEX
        let finalImageUrls = extractedImages.length > 0 ? extractedImages : [];
        
        console.log(`📊 Imagens para validar: ${finalImageUrls.length}`);

        const { title, description, price, brand, model } = aiResult;

        console.log(`✅ Título: ${title}`);
        console.log(`📸 Imagens a validar: ${finalImageUrls.length}`);

        // VALIDA IMAGENS (limitado para não travar)
        const validUrls = [];
        for (const url of finalImageUrls.slice(0, 12)) {
            if (validUrls.length >= 8) break;
            
            if (await validateImageUrl(url)) {
                validUrls.push(url);
                console.log(`✅ [${validUrls.length}] Válida: ${url.substring(0, 70)}`);
            } else {
                console.log(`❌ Inválida: ${url.substring(0, 70)}`);
            }
        }

        console.log(`✅ FINAL: ${validUrls.length} imagens validadas de ${finalImageUrls.length} extraídas`);

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