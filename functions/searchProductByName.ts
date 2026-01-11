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

        console.log('🔍 Parâmetros:', { productName, adUrl });

        // Se tiver adUrl, extrai direto
        if (adUrl && adUrl.trim()) {
            console.log('🔗 Extraindo direto da URL:', adUrl);

            try {
                const extractResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `Você DEVE acessar este anúncio: ${adUrl}

                    Extraia EXATAMENTE:
                    1. Título completo do produto
                    2. Descrição completa (mínimo 200 caracteres)
                    3. Preço exato em reais
                    4. Lista de 5-12 URLs de IMAGENS REAIS em alta resolução

                    Retorne um JSON válido:
                    {
                      "title": "string",
                      "description": "string", 
                      "price": número,
                      "image_urls": ["url1", "url2", ...]
                    }`,
                    add_context_from_internet: true,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            price: { type: "number" },
                            image_urls: { type: "array", items: { type: "string" } }
                        },
                        required: ["title", "image_urls"]
                    }
                });

                console.log('✅ Resposta LLM:', extractResponse);

                if (!extractResponse || !extractResponse.title) {
                    return Response.json({ error: "Não consegui extrair dados do anúncio" }, { status: 400 });
                }

                const imageUrls = (extractResponse.image_urls || []).filter(url => 
                    typeof url === 'string' && url.startsWith('http')
                );

                if (imageUrls.length === 0) {
                    return Response.json({ error: "Nenhuma imagem encontrada no anúncio" }, { status: 400 });
                }

                return Response.json({
                    found: true,
                    title: extractResponse.title || 'Produto',
                    description: extractResponse.description || '',
                    imageUrls: imageUrls,
                    price: extractResponse.price || null,
                    source: adUrl
                }, { status: 200 });

            } catch (llmError) {
                console.error('❌ Erro na LLM:', llmError.message);
                return Response.json({ error: `Erro ao processar: ${llmError.message}` }, { status: 500 });
            }
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



        // MODO PADRÃO: Extrai URLs de imagens do produto (galeria)
         let image_urls = [];

         if (sourceUrl) {
             try {
                 console.log('📸 Extraindo URLs de imagens da galeria do produto...');

                 const urlsResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
                     prompt: `Acesse esta URL: ${sourceUrl}

        Você precisa extrair APENAS as URLs das IMAGENS DO PRODUTO na galeria/carrossel (as imagens grandes da página).

        IMPORTANTE:
        - Procure especificamente por URLs que estejam na galeria/carousel do produto
        - Ignore logos, ícones, banners e imagens de interface
        - As URLs geralmente contêm padrões como:
          * magazineluiza.com.br/a-static/
          * mlcdn.com.br/
          * a-static.mlcdn.com.br/

        RETORNE um JSON com as URLs encontradas:
        {
          "images": ["https://...", "https://...", ...]
        }

        Se não conseguir acessar a página ou não houver imagens, retorne:
        {"images": []}`,
                     add_context_from_internet: true,
                     response_json_schema: {
                         type: "object",
                         properties: {
                             images: { type: "array", items: { type: "string" } }
                         },
                         required: ["images"]
                     }
                 });

                 console.log('🔍 Resposta IA (URLs):', urlsResponse?.images?.length, 'imagens encontradas');

                 if (urlsResponse && Array.isArray(urlsResponse.images) && urlsResponse.images.length > 0) {
                     // Filtra apenas URLs de alta qualidade (não google shopping)
                     image_urls = urlsResponse.images
                         .filter(url => {
                             if (!url || typeof url !== 'string') return false;
                             // Aceita URLs do site do anúncio ou de CDNs de qualidade
                             return url.includes('magazineluiza') || 
                                    url.includes('mlcdn.com') || 
                                    url.includes('a-static') ||
                                    (url.startsWith('https://') && !url.includes('encrypted-tbn') && !url.includes('google'));
                         })
                         .slice(0, 12);
                     console.log('✅ Extraídas', image_urls.length, 'URLs de imagens válidas');
                 } else {
                     console.log('⚠️ Nenhuma imagem encontrada na resposta');
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