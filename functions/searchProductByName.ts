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

        // Se tiver adUrl, vai direto extrair do anúncio
        if (adUrl) {
          console.log('🔗 MODO 2 ATIVADO - Extraindo diretamente do anúncio');

          let extractedTitle = 'Produto';
          let extractedDescription = '';
          let extractedPrice = null;
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
                  extractedTitle = extractResponse.title || 'Produto';
                  extractedDescription = extractResponse.description || '';
                  extractedPrice = extractResponse.price || null;
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
              return Response.json({ error: "Nenhuma imagem válida encontrada neste anúncio. Tente novamente." }, { status: 404 });
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
        
        // Já vem do Mercado Livre (filtrado acima)
        sourceUrl = firstResult.link || firstResult.redirect_link || '';
        isMercadoLivre = sourceUrl.includes('mercadolivre');
        source = isMercadoLivre ? 'Mercado Livre' : 'Loja Online';

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
             console.log('📋 Retornando lista de ANÚNCIOS DO MERCADO LIVRE...');
             const ads = [];
             const topResults = results.slice(0, 5); // Apenas 5 anúncios

             for (const result of topResults) {
                 if (!result.link) continue;

                 // Já é do Mercado Livre
                 const resultUrl = result.link || '';

                 ads.push({
                     title: result.title || productTitle,
                     url: resultUrl,
                     source: 'Mercado Livre',
                     price: result.price || 'Consulte',
                     snippet: result.snippet || '',
                     image: result.thumbnail || '',
                 });
             }

             console.log('✅ Retornando', ads.length, 'anúncios do Mercado Livre');
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

        // MODO PADRÃO: Extrai URLs de imagens do anúncio ML
         let image_urls = [];

         if (isMercadoLivre && sourceUrl) {
             try {
                 console.log('📸 Extraindo URLs de imagens do anúncio ML...');

                 const urlsResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
                     prompt: `Acesse este anúncio do Mercado Livre: ${sourceUrl}

        Extraía APENAS as URLs diretas das imagens da galeria de fotos do produto (imagens principais, não thumbnails).

        RETORNE APENAS UM ARRAY JSON com as URLs:
        ["https://...", "https://...", ...]

        Se não conseguir acessar, retorne: []`,
                     add_context_from_internet: true
                 });

                 console.log('🔍 Resposta IA (URLs):', urlsResponse?.substring(0, 100));

                 if (urlsResponse && urlsResponse.includes('http')) {
                     try {
                         const parsed = JSON.parse(urlsResponse);
                         if (Array.isArray(parsed)) {
                             image_urls = parsed.filter(url => typeof url === 'string' && url.startsWith('http'));
                             console.log('✅ Extraídas', image_urls.length, 'URLs de imagens');
                         }
                     } catch {
                         console.log('⚠️ Erro ao parsear URLs, tentando alternativa...');
                         // Tenta extrair URLs usando regex
                         const urlMatches = urlsResponse.match(/https:\/\/[^\s"'<>]+\.jpg/gi) || [];
                         image_urls = [...new Set(urlMatches)];
                         console.log('✅ Extraídas', image_urls.length, 'URLs via regex');
                     }
                 }
             } catch (err) {
                 console.log('⚠️ Erro ao extrair URLs:', err.message);
             }
         }

         return Response.json({
             found: true,
             title: productTitle,
             description: `${productTitle} - Preço de referência: R$ ${productPrice?.toFixed(2) || 'Consulte'}`,
             price: productPrice,
             image_urls: image_urls,
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