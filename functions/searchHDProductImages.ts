import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productName } = await req.json();
        if (!productName) {
            return Response.json({ error: "Nome do produto obrigatório" }, { status: 400 });
        }

        console.log(`🔍 [HD SEARCH] Buscando: ${productName}`);

        // 1️⃣ BUSCA NO GOOGLE SHOPPING VIA SERPAPI
        const serpApiKey = Deno.env.get('SERPAPI_KEY');
        if (!serpApiKey) {
            throw new Error('SERPAPI_KEY não configurada');
        }

        const serpUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(productName)}&api_key=${serpApiKey}&gl=br&hl=pt`;
        
        console.log('📡 Chamando SerpAPI...');
        const serpResponse = await fetch(serpUrl);
        const data = await serpResponse.json();

        if (!data.shopping_results || data.shopping_results.length === 0) {
            return Response.json({
                error: "Produto não encontrado no Google Shopping",
                found: false
            }, { status: 404 });
        }

        const productTitle = data.shopping_results[0].title;
        const productPrice = data.shopping_results[0].price;

        console.log(`📦 Produto: ${productTitle}`);

        // 2️⃣ COLETA LINKS DOS PRODUTOS (top 5)
        const productLinks = data.shopping_results.slice(0, 5)
            .map(r => r.link)
            .filter(link => link);

        console.log(`🔗 ${productLinks.length} produtos encontrados`);

        // 3️⃣ EXTRAI IMAGENS HD DE CADA PRODUTO USANDO IA
        const allImages = [];
        const seenUrls = new Set();

        for (const link of productLinks) {
            try {
                console.log(`🤖 Extraindo imagens de: ${link.substring(0, 50)}...`);

                const extractPrompt = `Analise esta página de produto e extraia URLs de imagens em ALTA RESOLUÇÃO.

URL: ${link}

CRITÉRIOS:
- Resolução mínima: 800x800px
- Buscar ângulos diferentes: frente, verso, laterais, detalhes
- IGNORAR: thumbnails, ícones, banners
- Máximo: 3 melhores imagens desta página

Retorne apenas imagens do produto principal.`;

                const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: extractPrompt,
                    add_context_from_internet: true,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            images: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        url: { type: "string" },
                                        resolution: { type: "string" },
                                        angle: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                });

                if (aiResponse?.images) {
                    for (const img of aiResponse.images) {
                        if (img.url && !seenUrls.has(img.url) && allImages.length < 10) {
                            // Identifica fonte
                            let source = 'Desconhecido';
                            if (link.includes('amazon')) source = 'Amazon';
                            else if (link.includes('mercadolivre')) source = 'Mercado Livre';
                            else if (link.includes('magazineluiza')) source = 'Magazine Luiza';
                            else if (link.includes('americanas')) source = 'Americanas';
                            else if (link.includes('carrefour')) source = 'Carrefour';
                            else if (link.includes('casasbahia')) source = 'Casas Bahia';

                            allImages.push({
                                url: img.url,
                                source,
                                resolution: img.resolution || 'N/A',
                                angle: img.angle || 'N/A'
                            });
                            seenUrls.add(img.url);
                            console.log(`✅ Imagem #${allImages.length}: ${source} - ${img.angle}`);
                        }
                    }
                }

                // Para se já tem 6+ imagens
                if (allImages.length >= 6) break;

            } catch (err) {
                console.log(`⚠️ Erro ao extrair de ${link}: ${err.message}`);
                continue;
            }
        }

        // 4️⃣ VALIDA IMAGENS
        const validatedImages = [];
        for (const img of allImages) {
            try {
                const headResponse = await fetch(img.url, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(3000)
                });
                
                if (headResponse.ok) {
                    const contentType = headResponse.headers.get('content-type');
                    if (contentType?.startsWith('image/')) {
                        validatedImages.push(img);
                    }
                }
            } catch (err) {
                continue;
            }
        }

        console.log(`✅ ${validatedImages.length} imagens HD validadas!`);

        // 5️⃣ VERIFICA QUANTIDADE MÍNIMA
        const response = {
            found: true,
            title: productTitle,
            description: productTitle,
            price: productPrice,
            imageUrls: validatedImages.map(i => i.url),
            imageDetails: validatedImages,
            thumbnailUrl: validatedImages[0]?.url,
            imageCount: validatedImages.length,
            quality_score: validatedImages.length >= 6 ? 9 : validatedImages.length * 1.5,
            source: 'Google Shopping + IA'
        };

        if (validatedImages.length < 6) {
            response.warning = `Apenas ${validatedImages.length} imagens de qualidade encontradas (ideal: 6+)`;
        }

        return Response.json(response, { status: 200 });

    } catch (error) {
        console.error('❌ ERRO:', error.message);
        return Response.json({
            error: "Erro ao buscar imagens HD",
            details: error.message,
            found: false
        }, { status: 500 });
    }
});