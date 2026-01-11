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

        // Busca no Mercado Livre via Google (mais direto)
        const serpApiKey = Deno.env.get('SERPAPI_KEY');
        if (!serpApiKey) {
            throw new Error('SERPAPI_KEY não configurada');
        }

        // 🔍 BUSCA FORÇANDO MERCADO LIVRE
        const searchUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(productName + ' site:mercadolivre.com.br')}&location=Brazil&hl=pt&gl=br&api_key=${serpApiKey}`;
        
        console.log('🔍 Buscando no Mercado Livre via Google:', searchUrl);
        
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error(`SerpAPI error: ${response.status}`);
        }

        const data = await response.json();
        
        // Converte organic_results para formato compatível
        let results = [];
        if (data.organic_results && data.organic_results.length > 0) {
            results = data.organic_results.filter(r => r.link && r.link.includes('mercadolivre'));
        } else if (data.shopping_results) {
            results = data.shopping_results;
        }
        
        if (!results || results.length === 0) {
            await base44.asServiceRole.entities.SystemLog.create({
              step: 'PRODUCT_SEARCH_BY_NAME_NOT_FOUND',
              status: 'warning',
              message: 'Produto não encontrado no Mercado Livre',
              component_name: 'searchProductByName',
              payload: { productName }
            }).catch(() => {});
            
            return Response.json({
                error: "Produto não encontrado no Mercado Livre",
                suggestion: "Tente com marca + modelo completo"
            }, { status: 404 });
        }

        // Pega o primeiro resultado (já é do Mercado Livre)
        const firstResult = results[0];
        const productTitle = firstResult.title;
        const productPrice = firstResult.extracted_price || firstResult.price;
        
        // 🔍 BUSCA AGRESSIVA DO MERCADO LIVRE NOS RESULTADOS
        let sourceUrl = '';
        let source = 'Google Shopping';
        let isMercadoLivre = false;
        
        // PRIORIDADE 1: Procura por Mercado Livre em redirect_link ou link
        for (const result of data.shopping_results) {
            const candidateUrl = result.redirect_link || result.link || '';
            
            if (candidateUrl && candidateUrl.includes('mercadolivre')) {
                sourceUrl = candidateUrl;
                isMercadoLivre = true;
                source = 'Mercado Livre';
                console.log('✅ ENCONTRADO MERCADO LIVRE:', sourceUrl);
                break;
            }
        }
        
        // PRIORIDADE 2: Se não achou ML, usa o primeiro resultado
        if (!sourceUrl) {
            sourceUrl = firstResult.redirect_link || firstResult.link || '';
            try {
                const urlObj = new URL(sourceUrl);
                source = firstResult.source || urlObj.hostname;
                console.log('✅ Usando primeiro resultado:', source);
            } catch (e) {
                source = firstResult.source || 'Loja Online';
                console.log('⚠️ Erro ao parsear URL, usando source:', source);
            }
        }

        console.log('✅ Produto encontrado:', productTitle);
        console.log('💰 Preço:', productPrice);
        console.log('🌐 Fonte:', source);
        console.log('🔗 URL Final:', sourceUrl);
        console.log('📍 É Mercado Livre?', isMercadoLivre);

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
             console.log('📋 Retornando lista de anúncios COM LINKS CORRETOS...');
             const ads = [];
             const topResults = data.shopping_results.slice(0, 5); // Apenas 5 anúncios

             for (const result of topResults) {
                 if (!result.link) continue;

                 // 🔍 Extrai link correto (pode ser redirect_link ou link)
                 let resultUrl = result.redirect_link || result.link;
                 let resultHost = '';
                 try {
                     const urlObj = new URL(resultUrl);
                     resultHost = urlObj.hostname;
                 } catch (e) {
                     resultHost = 'unknown';
                 }

                 const isMercado = resultHost.includes('mercadolivre');
                 const resultSource = isMercado ? 'Mercado Livre' : (result.source || 'Loja Online');

                 let imageUrl = result.thumbnail || `https://www.google.com/s2/favicons?domain=${resultHost}&sz=128`;

                 ads.push({
                     title: result.title || productTitle,
                     url: resultUrl,
                     source: resultSource,
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

        // MODO PADRÃO: Retorna prévia com fonte e link do anúncio original
         return Response.json({
             found: true,
             title: productTitle,
             description: `${productTitle} - Preço de referência: R$ ${productPrice?.toFixed(2) || 'Consulte'}`,
             price: productPrice,
             image_urls: firstResult.thumbnail ? [firstResult.thumbnail] : [],
             source: source,
             sourceUrl: sourceUrl,
             isMercadoLivre: isMercadoLivre
         }, { status: 200 });

    } catch (error) {
        console.error('❌ ERRO GERAL:', error.message);
        return Response.json({
            error: "Erro ao buscar produto",
            details: error.message
        }, { status: 500 });
    }
});