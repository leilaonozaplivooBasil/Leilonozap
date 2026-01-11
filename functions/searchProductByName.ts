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
        console.log('  - Tipo de listAdsOnly:', typeof listAdsOnly);
        console.log('  - listAdsOnly === true?', listAdsOnly === true);
        console.log('  - !!listAdsOnly?', !!listAdsOnly);
        
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
        
        console.log('🔍 DEBUG - SerpAPI Response Keys:', Object.keys(data));
        console.log('🔍 DEBUG - shopping_results existe?', !!data.shopping_results);
        console.log('🔍 DEBUG - shopping_results length:', data.shopping_results?.length || 0);
        
        if (!data.shopping_results || data.shopping_results.length === 0) {
            console.log('⚠️ Nenhum shopping_results, verificando alternativas...');
            console.log('🔍 inline_shopping_results:', data.inline_shopping_results?.length || 0);
            console.log('🔍 organic_results:', data.organic_results?.length || 0);
            
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

        // 🔍 DEBUG: Verificando modo de operação
        console.log('🔍 ========== VERIFICANDO MODO ==========');
        console.log('  - listAdsOnly:', listAdsOnly);
        console.log('  - listAdsOnly === true:', listAdsOnly === true);
        console.log('  - adUrl:', adUrl);
        console.log('  - !!adUrl:', !!adUrl);

        // 🆕 MODO 1: LISTAR ANÚNCIOS (sem buscar imagens)
        if (listAdsOnly === true) {
            console.log('📋 ========== MODO 1 ATIVADO ==========');
            console.log('📋 Retornando lista de anúncios...');
            console.log('📋 Shopping results disponíveis:', data.shopping_results.length);
            
            const ads = data.shopping_results.slice(0, 5).map((result, idx) => {
                console.log(`📋 Anúncio ${idx + 1}:`, result.source, '-', result.link?.substring(0, 50));
                return {
                    store: result.source || 'Loja Online',
                    price: result.extracted_price || result.price,
                    imageCount: '6-10', // Estimativa
                    link: result.link,
                    thumbnail: result.thumbnail
                };
            });

            console.log('✅ Retornando', ads.length, 'anúncios para frontend');
            console.log('✅ DEBUG - ads array:', JSON.stringify(ads, null, 2));
            console.log('📦 Estrutura de retorno:', { found: true, title: productTitle, ads: '(array com ' + ads.length + ' itens)' });

            // ⚠️ IMPORTANTE: RETORNAR AQUI E NÃO CONTINUAR!
            return Response.json({
                found: true,
                title: productTitle,
                ads: ads
            }, { status: 200 });
        }

        // Se chegou aqui, NÃO é modo listAdsOnly
        console.log('⚠️ Não entrou no modo listAdsOnly, continuando...');

        // 🆕 MODO 2: IMAGENS DE ANÚNCIO ESPECÍFICO
        if (adUrl) {
            console.log('🔗 ========== MODO 2 ATIVADO ==========');
            console.log('🔗 URL do anúncio:', adUrl);
            console.log('📸 Extraindo imagens REAIS do anúncio...');
            
            const specificImageUrls = [];
            const seenSpecificUrls = new Set();
            
            try {
                // 🆕 PROMPT MELHORADO para extrair imagens REAIS do produto
                const extractResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `Você é um extrator de imagens de produtos de e-commerce.

TAREFA: Acesse esta página de produto e extraia APENAS as URLs das imagens DO PRODUTO.

URL: ${adUrl}

REQUISITOS OBRIGATÓRIOS:
1. APENAS imagens do produto principal (não de acessórios, produtos relacionados ou anúncios)
2. Resolução mínima: 800x800px (ideal: 1000x1000px ou maior)
3. Buscar ÂNGULOS DIFERENTES: frente, verso, laterais, detalhes, aberto/fechado
4. IGNORAR:
   - Thumbnails pequenas
   - Ícones de pagamento/frete
   - Banners promocionais
   - Produtos relacionados
   - Imagens de reviews/avaliações
   - Logos de loja

5. Priorizar imagens no formato:
   - product-image
   - gallery-image
   - zoom-image
   - main-image
   - large-image

6. Retornar 6 a 12 URLs de imagens DIFERENTES e VARIADAS do produto

FORMATO DE RESPOSTA:
Retorne um array com as URLs completas (https://...) das melhores imagens encontradas.`,
                    add_context_from_internet: true,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            image_urls: { 
                                type: "array", 
                                items: { type: "string" },
                                description: "URLs completas das imagens do produto em alta resolução"
                            }
                        }
                    }
                });
                
                console.log('🔍 IA retornou:', extractResponse?.image_urls?.length || 0, 'URLs');
                
                if (extractResponse?.image_urls?.length > 0) {
                    for (const url of extractResponse.image_urls) {
                        if (url && !seenSpecificUrls.has(url) && specificImageUrls.length < 12) {
                            // Validar se é URL válida e se a imagem existe
                            const isValid = await validateImageUrl(url);
                            if (isValid) {
                                specificImageUrls.push(url);
                                seenSpecificUrls.add(url);
                                console.log(`✅ Imagem HD #${specificImageUrls.length}: ${url.substring(0, 80)}...`);
                            } else {
                                console.log(`❌ URL inválida ou imagem não acessível: ${url.substring(0, 80)}...`);
                            }
                        }
                    }
                } else {
                    console.log('⚠️ IA não retornou image_urls ou array vazio');
                }
            } catch (err) {
                console.error('❌ Erro ao extrair imagens com IA:', err.message);
                console.error('❌ Stack:', err.stack);
            }

            if (specificImageUrls.length === 0) {
                console.log('❌ Nenhuma imagem válida encontrada no anúncio');
                return Response.json({
                    error: "Nenhuma imagem HD encontrada neste anúncio",
                    suggestion: "Tente outro anúncio da lista",
                    details: "A IA não conseguiu extrair imagens válidas desta página"
                }, { status: 404 });
            }

            console.log(`✅ Total: ${specificImageUrls.length} imagens HD do anúncio`);

            return Response.json({
                found: true,
                title: productTitle,
                imageUrls: specificImageUrls,
                price: productPrice,
                source: adUrl
            }, { status: 200 });
        }

        // 🔥 MODO 3: BUSCA NORMAL (múltiplos anúncios)
        console.log('🖼️ ========== MODO 3 ATIVADO (PADRÃO) ==========');
        console.log('📸 Iniciando busca de imagens HD...');
        
        const imageUrls = [];
        const seenUrls = new Set(); // Evita duplicatas exatas
        
        // PRIORIDADE: Pega os 5 primeiros resultados do Google Shopping
        const topResults = data.shopping_results.slice(0, 5);
        
        for (const result of topResults) {
            // Pega link do produto
            const productLink = result.link;
            
            if (!productLink) continue;
            
            try {
                console.log(`🔗 Analisando: ${productLink.substring(0, 50)}...`);
                
                // Extrai imagens do produto usando InvokeLLM
                const extractResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `Analise esta página de produto e extraia APENAS as URLs de imagens do produto em ALTA RESOLUÇÃO.

Requisitos:
- Resolução MÍNIMA: 800x800px (ideal: 1200x1200px ou maior)
- Buscar ÂNGULOS DIFERENTES: frente, verso, laterais, detalhes
- IGNORAR: thumbnails, ícones, logos, banners, imagens pequenas
- Retornar as 6 MELHORES imagens mais VARIADAS

URL da página: ${productLink}`,
                    add_context_from_internet: true,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            image_urls: {
                                type: "array",
                                items: { type: "string" },
                                description: "URLs das imagens de alta resolução"
                            }
                        }
                    }
                });
                
                if (extractResponse?.image_urls && Array.isArray(extractResponse.image_urls)) {
                    for (const url of extractResponse.image_urls) {
                        if (url && !seenUrls.has(url) && imageUrls.length < 10) {
                            // Valida se é imagem
                            const isValid = await validateImageUrl(url);
                            if (isValid) {
                                imageUrls.push(url);
                                seenUrls.add(url);
                                console.log(`✅ Imagem HD #${imageUrls.length}: ${url.substring(0, 60)}...`);
                            }
                        }
                    }
                }
                
                // Se já temos 6+ imagens, para
                if (imageUrls.length >= 6) break;
                
            } catch (extractError) {
                console.log(`⚠️ Erro ao extrair de ${productLink.substring(0, 30)}: ${extractError.message}`);
                continue;
            }
        }

        // Se não conseguiu imagens HD, usa thumbnails como fallback
        if (imageUrls.length === 0) {
            console.log('⚠️ Nenhuma imagem HD encontrada, usando thumbnails...');
            for (const result of topResults) {
                if (result.thumbnail && !seenUrls.has(result.thumbnail)) {
                    imageUrls.push(result.thumbnail);
                    seenUrls.add(result.thumbnail);
                }
            }
        }

        if (imageUrls.length === 0) {
            return Response.json({
                error: "Produto encontrado mas sem imagens válidas",
                suggestion: "Use o importador por URL com link direto do produto",
                title: productTitle,
                description: productTitle
            }, { status: 404 });
        }

        console.log(`✅ ${productTitle}: ${imageUrls.length} imagens HD coletadas`);

        // Log de sucesso
        await base44.asServiceRole.entities.SystemLog.create({
          step: 'PRODUCT_SEARCH_BY_NAME_SUCCESS',
          status: 'success',
          message: `Produto encontrado via Google Shopping: ${productTitle}`,
          component_name: 'searchProductByName',
          payload: { 
            productName,
            title: productTitle,
            imageCount: imageUrls.length,
            price: productPrice
          }
        }).catch(() => {});

        // 🆕 RETORNA PREVIEW + IMAGENS (uma única chamada à API)
        return Response.json({
            found: true,
            title: productTitle,
            description: `${productTitle} - Preço de referência: R$ ${productPrice?.toFixed(2) || 'Consulte'}`,
            imageUrls: imageUrls, // Todas as imagens
            price: productPrice,
            thumbnailUrl: firstResult.thumbnail || imageUrls[0] || null, // Preview
            imageCount: imageUrls.length,
            source: 'Google Shopping'
        }, { status: 200 });

    } catch (error) {
        console.error('❌ ERRO:', error.message);
        return Response.json({
            error: "Erro ao buscar produto",
            details: error.message
        }, { status: 500 });
    }
});