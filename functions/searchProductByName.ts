import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function validateImageUrl(url) {
    try {
        const response = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
        });
        
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

        const { productName, listAdsOnly, adUrl } = await req.json();
        
        // 🔍 DEBUG: Parâmetros recebidos
        console.log('🔍 ========== PARÂMETROS RECEBIDOS ==========');
        console.log('  - productName:', productName);
        console.log('  - listAdsOnly:', listAdsOnly);
        console.log('  - adUrl:', adUrl);
        
        if (!productName) {
            return Response.json({ error: "Nome do produto obrigatório" }, { status: 400 });
        }
        
        // Log de início
        await base44.asServiceRole.entities.SystemLog.create({
          step: 'PRODUCT_SEARCH_BY_NAME_INITIATED',
          status: 'info',
          message: 'Busca de produto por nome iniciada',
          component_name: 'searchProductByName',
          payload: { productName }
        }).catch(() => {});

        // Busca no Google Shopping via SerpAPI
        const serpApiKey = Deno.env.get('SERPAPI_KEY');
        if (!serpApiKey) {
            throw new Error('SERPAPI_KEY não configurada');
        }

        const searchUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(productName)}&location=Brazil&hl=pt&gl=br&api_key=${serpApiKey}`;
        
        console.log('🔍 Buscando no Google Shopping:', searchUrl);
        
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error(`SerpAPI error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.shopping_results || data.shopping_results.length === 0) {
            await base44.asServiceRole.entities.SystemLog.create({
              step: 'PRODUCT_SEARCH_BY_NAME_NOT_FOUND',
              status: 'warning',
              message: 'Produto não encontrado no Google Shopping',
              component_name: 'searchProductByName',
              payload: { productName }
            }).catch(() => {});
            
            return Response.json({
                error: "Produto não encontrado no Google Shopping",
                suggestion: "Tente com marca + modelo completo"
            }, { status: 404 });
        }

        // Pega o primeiro resultado mais relevante
        const firstResult = data.shopping_results[0];
        const productTitle = firstResult.title;
        const productPrice = firstResult.extracted_price || firstResult.price;

        console.log('✅ Produto encontrado:', productTitle);
        console.log('💰 Preço:', productPrice);

        // Valida acessórios no título
        const lower = productTitle.toLowerCase();
        const accessoryKeywords = [
            'carregador', 'charger', 'cabo', 'cable', 'capa', 'case',
            'película', 'protetor', 'glass', 'adaptador', 'adapter', 'fone'
        ];
        if (accessoryKeywords.some(k => lower.includes(k))) {
            return Response.json({
                error: "Sistema encontrou apenas acessórios",
                suggestion: "Seja mais específico no nome do produto"
            }, { status: 404 });
        }

        // 🆕 MODO 1: LISTAR ANÚNCIOS (com imagem extraída)
         if (listAdsOnly === true) {
             console.log('📋 ========== MODO 1 ATIVADO ==========');
             console.log('📋 Retornando lista de anúncios COM IMAGENS...');
             const ads = [];
             const topResults = data.shopping_results.slice(0, 5); // Apenas 5 anúncios

             for (const result of topResults) {
                 if (!result.link) continue;

                 let imageUrl = result.thumbnail || `https://www.google.com/s2/favicons?domain=${new URL(result.link).hostname}&sz=128`;
                 
                 ads.push({
                     title: result.title || productTitle,
                     url: result.link,
                     source: result.source || 'Loja Online',
                     price: result.extracted_price || result.price || 'Consulte',
                     snippet: result.snippet || '',
                     image: imageUrl,
                 });
             }

             console.log('✅ Retornando', ads.length, 'anúncios para frontend');
             return Response.json({
                 found: true,
                 title: productTitle,
                 ads: ads
             }, { status: 200 });
         }

        // 🆕 MODO 2: CLONAR ANÚNCIO COMPLETO (título, descrição, preço, imagens)
        if (adUrl) {
            console.log('🔗 ========== MODO 2 ATIVADO (CLONAR ANÚNCIO) ==========');
            let extractedTitle = productTitle;
            let extractedDescription = '';
            let extractedPrice = productPrice;
            let specificImageUrls = [];
            
            try {
                const extractResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `Acesse e clone COMPLETAMENTE o anúncio: ${adUrl}. Extraia: título completo, descrição completa com especificações (mínimo 300 caracteres), preço exato e uma galeria de 8 a 12 imagens em alta resolução (mínimo 800px) com ÂNGULOS DIFERENTES (frente, traseira, laterais, detalhes, etc). Ignore thumbnails e imagens repetidas. RETORNE EM JSON.`,
                    add_context_from_internet: true,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            price: { type: "number" },
                            image_urls: { type: "array", items: { type: "string" } }
                        },
                        required: ["title", "description", "price", "image_urls"]
                    }
                });
                
                if (extractResponse) {
                    extractedTitle = extractResponse.title || extractedTitle;
                    extractedDescription = extractResponse.description || '';
                    extractedPrice = extractResponse.price || extractedPrice;
                    if (extractResponse.image_urls?.length > 0) {
                        const validatedUrls = [];
                        for(const url of extractResponse.image_urls) {
                            if (await validateImageUrl(url)) {
                                validatedUrls.push(url);
                            }
                        }
                        specificImageUrls = [...new Set(validatedUrls)];
                    }
                }
            } catch (err) {
                console.error('❌ Erro ao extrair com IA:', err.message);
            }

            if (specificImageUrls.length === 0) {
                 return Response.json({ error: "Nenhuma imagem válida encontrada neste anúncio" }, { status: 404 });
            }

            return Response.json({
                found: true,
                title: extractedTitle,
                description: extractedDescription,
                imageUrls: specificImageUrls,
                price: extractedPrice,
                source: adUrl
            }, { status: 200 });
        }

        // MODO PADRÃO: Retorna apenas a prévia inicial
        return Response.json({
            found: true,
            title: productTitle,
            description: `${productTitle} - Preço de referência: R$ ${productPrice?.toFixed(2) || 'Consulte'}`,
            price: productPrice,
            thumbnailUrl: firstResult.thumbnail || null,
            imageCount: data.shopping_results.length,
            source: 'Google Shopping'
        }, { status: 200 });

    } catch (error) {
        console.error('❌ ERRO GERAL:', error.message);
        return Response.json({
            error: "Erro ao buscar produto",
            details: error.message
        }, { status: 500 });
    }
});