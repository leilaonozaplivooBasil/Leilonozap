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

        const { productName } = await req.json();
        if (!productName) {
            return Response.json({ error: "Nome do produto obrigatório" }, { status: 400 });
        }

        console.log(`🔍 Buscando: ${productName}`);
        
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

        // 🔥 BUSCA IMAGENS DE ALTA QUALIDADE
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