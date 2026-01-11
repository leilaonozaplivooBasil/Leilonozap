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

        // 🆕 MODO 1: LISTAR ANÚNCIOS (com imagem extraída)
         if (listAdsOnly === true) {
             console.log('📋 ========== MODO 1 ATIVADO ==========');
             console.log('📋 Retornando lista de anúncios COM IMAGENS...');
             console.log('📋 Shopping results disponíveis:', data.shopping_results.length);

             const ads = [];
             const topResults = data.shopping_results.slice(0, 10);

             for (const result of topResults) {
                 if (!result.link) continue;

                 let imageUrl = null;
                 let imageStatus = null;

                 try {
                     // 1️⃣ Tenta usar a imagem da API
                     if (result.thumbnail) {
                         imageUrl = result.thumbnail;
                         imageStatus = 'api';
                         console.log(`✅ Imagem API: ${imageUrl.substring(0, 50)}...`);
                     } else {
                         // 2️⃣ Tenta extrair og:image ou twitter:image
                         const metaResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
                             prompt: `Acesse ${result.link} e retorne a URL da imagem principal do produto (meta og:image ou primeira imagem visível).`,
                             add_context_from_internet: true,
                             response_json_schema: {
                                 type: "object",
                                 properties: {
                                     image_url: { type: "string" }
                                 }
                             }
                         });

                         if (metaResponse?.image_url) {
                             imageUrl = metaResponse.image_url;
                             imageStatus = 'scrape';
                             console.log(`✅ Imagem scrape: ${imageUrl.substring(0, 50)}...`);
                         } else {
                             // 3️⃣ Fallback: favicon
                             const domainUrl = new URL(result.link).hostname;
                             imageUrl = `https://www.google.com/s2/favicons?domain=${domainUrl}&sz=256`;
                             imageStatus = 'fallback';
                             console.log(`⚠️ Fallback (favicon): ${domainUrl}`);
                         }
                     }
                 } catch (err) {
                     console.log(`⚠️ Erro ao extrair imagem: ${err.message}`);
                     imageStatus = 'fallback';
                     const domainUrl = new URL(result.link).hostname;
                     imageUrl = `https://www.google.com/s2/favicons?domain=${domainUrl}&sz=256`;
                 }

                 ads.push({
                     title: result.title || productTitle,
                     url: result.link,
                     source: result.source || 'Loja Online',
                     price: result.extracted_price || result.price || 'Consulte',
                     snippet: result.snippet || '',
                     image: imageUrl,
                     image_status: imageStatus
                 });
             }

             console.log('✅ Retornando', ads.length, 'anúncios COM imagens para frontend');

             // ⚠️ IMPORTANTE: RETORNAR AQUI E NÃO CONTINUAR!
             return Response.json({
                 found: true,
                 title: productTitle,
                 ads: ads.slice(0, 10) // Máximo 10
             }, { status: 200 });
         }

        // Se chegou aqui, NÃO é modo listAdsOnly
        console.log('⚠️ Não entrou no modo listAdsOnly, continuando...');

        // 🆕 MODO 2: CLONAR ANÚNCIO COMPLETO (título, descrição, preço, imagens)
        if (adUrl) {
            console.log('🔗 ========== MODO 2 ATIVADO (CLONAR ANÚNCIO) ==========');
            console.log('🔗 URL do anúncio:', adUrl);
            console.log('📸 Extraindo TODOS os dados do anúncio...');
            
            const specificImageUrls = [];
            const seenSpecificUrls = new Set();
            let extractedTitle = productTitle;
            let extractedDescription = '';
            let extractedPrice = productPrice;
            
            try {
                // 🆕 PROMPT AGRESSIVO - FORÇA ÂNGULOS DIFERENTES
                const extractResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `Você é um clonador profissional de anúncios de e-commerce.

🎯 TAREFA: Acesse e clone COMPLETAMENTE este anúncio:
${adUrl}

📋 EXTRAIR OBRIGATORIAMENTE:

1️⃣ TÍTULO COMPLETO:
   - Marca + Modelo + Características (ex: "Notebook Gamer Acer Nitro V15 Intel Core i5...")
   - Copie EXATAMENTE como está no anúncio

2️⃣ DESCRIÇÃO COMPLETA:
   - Todo o texto descritivo do anúncio
   - Especificações técnicas detalhadas
   - Ficha técnica completa
   - Conteúdo da caixa/embalagem
   - MÍNIMO 300 caracteres

3️⃣ PREÇO EXATO:
   - Valor numérico em R$ (ex: 4299.90)

4️⃣ GALERIA DE IMAGENS (CRÍTICO):
   ⚠️ REGRA OBRIGATÓRIA: BUSCAR ÂNGULOS COMPLETAMENTE DIFERENTES!
   
   Procure na GALERIA DE IMAGENS do produto:
   - ✅ Frente (visão frontal do produto)
   - ✅ Traseira (parte de trás)
   - ✅ Lateral direita
   - ✅ Lateral esquerda
   - ✅ Superior (vista de cima)
   - ✅ Detalhes (zoom em partes específicas)
   - ✅ Aberto/Fechado (se aplicável)
   - ✅ Em uso (se houver)
   
   🚫 IGNORAR COMPLETAMENTE:
   - Miniaturas/thumbnails pequenas (menos de 500px)
   - Mesma foto em resoluções diferentes
   - Ícones, logos, selos
   - Produtos relacionados/sugeridos
   - Banners promocionais
   
   📏 REQUISITOS:
   - Resolução MÍNIMA: 800x800px
   - IDEAL: 1200x1200px ou maior
   - Formatos: JPG, PNG, WEBP
   - OBRIGATÓRIO: 8 a 12 imagens de ÂNGULOS DIFERENTES
   
   🔍 Onde procurar:
   - Tags com class/id contendo: "gallery", "zoom", "large", "fullsize", "product-image"
   - Elementos <img> dentro de carrosséis/sliders
   - Links de zoom/ampliação

IMPORTANTE: Se o produto tem 10 fotos mas todas são do mesmo ângulo, retorne APENAS 1 e busque outros ângulos!

RETORNE EM JSON:`,
                    add_context_from_internet: true,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            title: { 
                                type: "string",
                                description: "Título COMPLETO do anúncio original"
                            },
                            description: {
                                type: "string",
                                description: "Descrição COMPLETA com especificações técnicas (mín 300 chars)"
                            },
                            price: {
                                type: "number",
                                description: "Preço em R$ (número decimal)"
                            },
                            image_urls: { 
                                type: "array", 
                                items: { type: "string" },
                                description: "URLs de 8-12 imagens em ÂNGULOS DIFERENTES e alta resolução"
                            }
                        },
                        required: ["title", "description", "price", "image_urls"]
                    }
                });
                
                console.log('🔍 IA retornou:', JSON.stringify(extractResponse, null, 2));
                
                // Extrai dados textuais
                if (extractResponse?.title) {
                    extractedTitle = extractResponse.title;
                    console.log('✅ Título extraído:', extractedTitle);
                }
                
                if (extractResponse?.description) {
                    extractedDescription = extractResponse.description;
                    console.log('✅ Descrição extraída:', extractedDescription.substring(0, 100) + '...');
                }
                
                if (extractResponse?.price) {
                    extractedPrice = extractResponse.price;
                    console.log('✅ Preço extraído: R$', extractedPrice);
                }
                
                // Extrai e valida imagens
                if (extractResponse?.image_urls?.length > 0) {
                    console.log('📸 Validando', extractResponse.image_urls.length, 'imagens...');
                    
                    for (const url of extractResponse.image_urls) {
                        if (url && !seenSpecificUrls.has(url) && specificImageUrls.length < 12) {
                            const isValid = await validateImageUrl(url);
                            if (isValid) {
                                specificImageUrls.push(url);
                                seenSpecificUrls.add(url);
                                console.log(`✅ Imagem HD #${specificImageUrls.length}: ${url.substring(0, 80)}...`);
                            } else {
                                console.log(`❌ URL inválida: ${url.substring(0, 80)}...`);
                            }
                        }
                    }
                } else {
                    console.log('⚠️ IA não retornou image_urls');
                }
            } catch (err) {
                console.error('❌ Erro ao extrair com IA:', err.message);
            }

            if (specificImageUrls.length === 0) {
                console.log('❌ Nenhuma imagem válida encontrada');
                return Response.json({
                    error: "Nenhuma imagem encontrada neste anúncio",
                    suggestion: "Tente outro anúncio da lista"
                }, { status: 404 });
            }

            console.log(`✅ ANÚNCIO CLONADO COM SUCESSO!`);
            console.log(`   📝 Título: ${extractedTitle}`);
            console.log(`   📄 Descrição: ${extractedDescription.substring(0, 50)}...`);
            console.log(`   💰 Preço: R$ ${extractedPrice}`);
            console.log(`   📸 Imagens: ${specificImageUrls.length}`);

            return Response.json({
                found: true,
                title: extractedTitle,
                description: extractedDescription,
                imageUrls: specificImageUrls,
                price: extractedPrice,
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