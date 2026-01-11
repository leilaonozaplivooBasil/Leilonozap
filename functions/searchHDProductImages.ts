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

        // BUSCA NO GOOGLE SHOPPING
        const serpApiKey = Deno.env.get('SERPAPI_KEY');
        if (!serpApiKey) {
            throw new Error('SERPAPI_KEY não configurada');
        }

        const serpUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(productName)}&api_key=${serpApiKey}&gl=br&hl=pt&num=20`;
        
        console.log('📡 SerpAPI...');
        const serpResponse = await fetch(serpUrl);
        const data = await serpResponse.json();

        if (!data.shopping_results || data.shopping_results.length === 0) {
            return Response.json({
                error: "Produto não encontrado",
                found: false
            }, { status: 404 });
        }

        const productTitle = data.shopping_results[0].title;
        const productPrice = data.shopping_results[0].extracted_price;

        // COLETA IMAGENS DE MÚLTIPLOS RESULTADOS
        console.log(`📋 Total de resultados: ${data.shopping_results.length}`);
        
        const allImages = [];
        const seenUrls = new Set();

        for (let i = 0; i < Math.min(15, data.shopping_results.length); i++) {
            const result = data.shopping_results[i];
            
            console.log(`🔍 Resultado ${i + 1}:`, {
                title: result.title?.substring(0, 30),
                hasThumbnail: !!result.thumbnail,
                hasLink: !!result.link
            });
            
            // Identifica fonte
            let source = 'Google Shopping';
            const link = result.link || '';
            if (link.includes('amazon')) source = 'Amazon';
            else if (link.includes('mercadolivre') || link.includes('mercadolibre')) source = 'Mercado Livre';
            else if (link.includes('magazineluiza')) source = 'Magazine Luiza';
            else if (link.includes('americanas')) source = 'Americanas';
            else if (link.includes('carrefour')) source = 'Carrefour';
            else if (link.includes('casasbahia')) source = 'Casas Bahia';
            
            const imgUrl = result.thumbnail;
            
            if (imgUrl && !seenUrls.has(imgUrl)) {
                allImages.push({
                    url: imgUrl,
                    source,
                    resolution: 'Auto',
                    angle: `Ângulo #${allImages.length + 1}`
                });
                seenUrls.add(imgUrl);
                console.log(`✅ Imagem coletada #${allImages.length}: ${source}`);
            } else {
                console.log(`⚠️ Sem thumbnail ou duplicada`);
            }
            
            if (allImages.length >= 12) break;
        }
        
        console.log(`📦 Total coletado: ${allImages.length} imagens`);

        // VALIDA URLS
        const validatedImages = [];
        for (const img of allImages) {
            try {
                const headResponse = await fetch(img.url, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(2000)
                });
                
                if (headResponse.ok) {
                    validatedImages.push(img);
                }
            } catch (err) {
                continue;
            }
        }

        console.log(`✅ ${validatedImages.length} imagens validadas`);

        const response = {
            found: true,
            title: productTitle,
            description: productTitle,
            price: productPrice,
            imageUrls: validatedImages.map(i => i.url),
            imageDetails: validatedImages,
            thumbnailUrl: validatedImages[0]?.url,
            imageCount: validatedImages.length,
            quality_score: Math.min(10, validatedImages.length),
            source: 'Google Shopping'
        };

        if (validatedImages.length < 6) {
            response.warning = `Apenas ${validatedImages.length} imagens encontradas (ideal: 6+)`;
        }

        return Response.json(response, { status: 200 });

    } catch (error) {
        console.error('❌ ERRO:', error.message);
        return Response.json({
            error: "Erro ao buscar imagens",
            details: error.message,
            found: false
        }, { status: 500 });
    }
});