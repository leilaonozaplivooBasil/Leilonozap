import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// 🔥 VALIDAÇÃO AVANÇADA DE IMAGENS
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

// 🎯 SCORE DE RELEVÂNCIA DA IMAGEM
function calculateImageScore(url, productName) {
    let score = 0;
    const lowerUrl = url.toLowerCase();
    const lowerProduct = productName.toLowerCase();
    
    // ❌ PENALIDADES BRUTAIS - Acessórios e imagens ruins
    const accessoryKeywords = [
        'adapter', 'adaptador', 'charger', 'carregador', 'cabo', 'cable',
        'capa', 'case', 'cover', 'pelicula', 'protetor', 'glass',
        'fone', 'earphone', 'headphone', 'suporte', 'stand', 'holder',
        'power', 'usb', 'plug'
    ];
    if (accessoryKeywords.some(k => lowerUrl.includes(k))) score -= 500; // BLOQUEIO TOTAL
    
    if (lowerUrl.match(/logo|icon|banner|sprite|button|arrow|star|badge|seal|stamp/i)) score -= 100;
    if (lowerUrl.includes('thumbnail') || lowerUrl.includes('thumb')) score -= 50;
    if (lowerUrl.includes('avatar') || lowerUrl.includes('user')) score -= 100;
    if (lowerUrl.match(/\d{1,3}x\d{1,3}/)) score -= 30;
    if (lowerUrl.includes('az-request')) score -= 200;
    
    // ✅ BONIFICAÇÕES - CDNs confiáveis de produtos
    if (lowerUrl.includes('mlstatic.com')) score += 50;
    if (lowerUrl.includes('amazonaws.com') || lowerUrl.includes('cloudfront')) score += 40;
    if (lowerUrl.includes('shopee') || lowerUrl.includes('magazineluiza')) score += 40;
    if (lowerUrl.includes('images-')) score += 30;
    if (lowerUrl.includes('product') || lowerUrl.includes('produto')) score += 30;
    
    // ✅ Nome do arquivo contém palavras do produto
    const productWords = lowerProduct.split(' ').filter(w => w.length > 3);
    productWords.forEach(word => {
        if (lowerUrl.includes(word)) score += 20;
    });
    
    // ✅ Extensões de imagem de qualidade
    if (lowerUrl.match(/\.(jpg|jpeg|webp|png)$/i)) score += 10;
    
    // ✅ Galeria de produtos (padrões comuns)
    if (lowerUrl.match(/gallery|galeria|slide|carousel|zoom/i)) score += 25;
    
    // ✅ URL longa geralmente = imagem de produto
    if (lowerUrl.length > 100) score += 15;
    
    return score;
}

// 🤖 ANÁLISE COMPLETA COM IA VISION
async function analyzeImageWithAI(imageUrl, productName, base44) {
    try {
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `ANÁLISE DETALHADA DA IMAGEM:

PRODUTO BUSCADO: "${productName}"

RESPONDA EM JSON:
1. isProduct: Esta é uma imagem do produto "${productName}"? (true/false)
2. imageType: Tipo da imagem
   - "product_photo" = foto do produto isolado em fundo branco
   - "lifestyle" = produto em uso/ambiente real
   - "accessory" = acessório/complemento
   - "logo" = logo/marca
   - "banner" = banner/propaganda
   - "text" = principalmente texto
3. confidence: Confiança da análise (0-100)
4. extractedText: Qualquer texto visível na imagem (OCR)
5. reason: Justificativa em 1 linha

REGRAS:
- Se não for o produto exato: isProduct = false
- Fotos de acessórios isolados = accessory
- Logos/ícones = logo`,
            file_urls: [imageUrl],
            response_json_schema: {
                type: "object",
                properties: {
                    isProduct: { type: "boolean" },
                    imageType: { 
                        type: "string",
                        enum: ["product_photo", "lifestyle", "accessory", "logo", "banner", "text"]
                    },
                    confidence: { type: "number" },
                    extractedText: { type: "string" },
                    reason: { type: "string" }
                },
                required: ["isProduct", "imageType", "confidence", "reason"]
            }
        });
        
        console.log(`🤖 Análise IA: ${result.isProduct ? '✅' : '❌'} | Tipo: ${result.imageType} | Conf: ${result.confidence}% | Texto: "${result.extractedText || 'nenhum'}"`);
        return result;
    } catch (error) {
        console.log(`⚠️ Análise IA falhou: ${error.message}`);
        return { isProduct: true, imageType: "product_photo", confidence: 50, extractedText: "", reason: "Fallback" };
    }
}

// 🔍 DETECÇÃO DE SIMILARIDADE VISUAL (via IA)
async function calculateImageSimilarity(imageUrl1, imageUrl2, base44) {
    try {
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Compare estas duas imagens de produto:

RESPONDA:
- areSimilar: As imagens mostram o MESMO produto? (true/false)
- similarityScore: Score de similaridade 0-100
- reason: Breve explicação

CRITÉRIOS:
- Mesmo modelo/cor = similar
- Ângulos diferentes do mesmo produto = similar
- Produtos diferentes = não similar`,
            file_urls: [imageUrl1, imageUrl2],
            response_json_schema: {
                type: "object",
                properties: {
                    areSimilar: { type: "boolean" },
                    similarityScore: { type: "number" },
                    reason: { type: "string" }
                },
                required: ["areSimilar", "similarityScore", "reason"]
            }
        });
        
        return result;
    } catch (error) {
        console.log(`⚠️ Similaridade falhou: ${error.message}`);
        return { areSimilar: false, similarityScore: 0, reason: "Error" };
    }
}

// 🧹 DEDUPLICAÇÃO INTELIGENTE
function deduplicateImages(urls) {
    const seen = new Set();
    const unique = [];
    
    for (const url of urls) {
        // Remove parâmetros de query e fragmentos
        const cleanUrl = url.split('?')[0].split('#')[0];
        
        if (!seen.has(cleanUrl)) {
            seen.add(cleanUrl);
            unique.push(url);
        }
    }
    
    return unique;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productName } = await req.json();
        if (!productName) {
            return Response.json({ error: "Nome do produto obrigatório" }, { status: 400 });
        }

        console.log(`🔍 NOVA ESTRATÉGIA: ${productName}`);

        // 🎯 ETAPA 1: BUSCA INTELIGENTE DE URLs REAIS
        console.log('🌐 Buscando páginas de produto nos marketplaces...');
        
        const searchQueries = [
            `site:produto.mercadolivre.com.br ${productName}`,
            `site:www.amazon.com.br ${productName}`,
            `site:shopee.com.br ${productName}`,
            `${productName} mercado livre`,
            `${productName} amazon`,
        ];
        
        const foundUrls = [];
        
        for (const query of searchQueries) {
            try {
                const searchResult = await base44.integrations.Core.InvokeLLM({
                    prompt: `Busque na internet: "${query}"
                    
Encontre a URL de UM produto individual (não lista de busca).

VÁLIDO:
✅ produto.mercadolivre.com.br/MLB-...
✅ amazon.com.br/dp/...
✅ amazon.com.br/.../dp/...
✅ shopee.com.br/product/...

INVÁLIDO:
❌ lista.mercadolivre
❌ /s?k=
❌ /search

Retorne apenas a URL encontrada ou null.`,
                    add_context_from_internet: true,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            productUrl: { type: ["string", "null"] }
                        },
                        required: ["productUrl"]
                    }
                });
                
                const url = searchResult?.productUrl;
                if (url && typeof url === 'string' && url.startsWith('http')) {
                    // Valida formato
                    const lower = url.toLowerCase();
                    const isValid = 
                        (lower.includes('produto.mercadolivre') || lower.includes('articulo.mercadolibre')) ||
                        (lower.includes('amazon') && (lower.includes('/dp/') || lower.includes('/gp/product/'))) ||
                        (lower.includes('shopee') && lower.includes('/product/')) ||
                        lower.includes('magazineluiza.com.br/') ||
                        lower.includes('casasbahia.com.br/');
                    
                    const isInvalidList = 
                        lower.includes('lista.mercado') ||
                        lower.includes('/s?k=') ||
                        lower.includes('/search');
                    
                    if (isValid && !isInvalidList && !foundUrls.includes(url)) {
                        foundUrls.push(url);
                        console.log(`✅ URL encontrada: ${url.substring(0, 80)}`);
                        
                        if (foundUrls.length >= 3) break; // Limita a 3 URLs
                    }
                }
            } catch (e) {
                console.log(`⚠️ Busca falhou: ${e.message}`);
            }
        }
        
        if (foundUrls.length === 0) {
            return Response.json({
                error: "Nenhuma página de produto encontrada",
                suggestion: "Tente com mais detalhes: marca + modelo + capacidade"
            }, { status: 404 });
        }
        
        console.log(`📦 ${foundUrls.length} URLs para processar`);
        
        // 🎯 ETAPA 2: EXTRAI DADOS DE CADA URL USANDO extractDataFromUrl
        const results = [];
        
        for (const url of foundUrls) {
            try {
                console.log(`🔄 Extraindo: ${url.substring(0, 60)}...`);
                
                // Chama a função extractDataFromUrl que já funciona bem
                const extractResult = await base44.functions.invoke('extractDataFromUrl', {
                    productUrl: url
                });
                
                if (extractResult?.data) {
                    const data = extractResult.data;
                    
                    if (data.title && data.imageUrls?.length > 0) {
                        // Valida se não é acessório
                        const lower = data.title.toLowerCase();
                        const accessoryKeywords = [
                            'carregador', 'charger', 'cabo', 'cable', 'capa', 'case',
                            'película', 'protetor', 'glass', 'adaptador', 'adapter'
                        ];
                        const isAccessory = accessoryKeywords.some(k => lower.includes(k));
                        
                        if (!isAccessory) {
                            results.push({
                                title: data.title,
                                description: data.description,
                                imageUrls: data.imageUrls,
                                sourceUrl: url,
                                imageCount: data.imageUrls.length
                            });
                            console.log(`✅ Extraído: ${data.title} (${data.imageUrls.length} imgs)`);
                        } else {
                            console.log(`🚫 Rejeitado acessório: ${data.title}`);
                        }
                    }
                }
            } catch (e) {
                console.log(`❌ Erro ao extrair ${url}: ${e.message}`);
            }
        }
        
        if (results.length === 0) {
            return Response.json({
                error: "Nenhum produto válido foi extraído",
                suggestion: "Tente usar o importador por URL ou upload manual"
            }, { status: 404 });
        }
        
        // 🎯 ETAPA 3: SELECIONA O MELHOR RESULTADO
        results.sort((a, b) => b.imageCount - a.imageCount);
        const best = results[0];
        
        console.log(`🏆 Melhor resultado: ${best.title} com ${best.imageCount} imagens`);
        
        let { title, description, productPageUrl } = best;
        
        console.log(`✅ Produto encontrado com ${imageUrls.length} imagens`);
        
        // 🎯 Limita a 6 imagens finais
        const finalUrls = imageUrls.slice(0, 6);
        
        console.log(`🎉 RETORNANDO ${finalUrls.length} IMAGENS VALIDADAS`);

        const detectedMarketplace = 
            productPageUrl.includes('mercadolivre') || productPageUrl.includes('mercadolibre') ? 'Mercado Livre' :
            productPageUrl.includes('amazon') ? 'Amazon' :
            productPageUrl.includes('shopee') ? 'Shopee' :
            productPageUrl.includes('magazineluiza') || productPageUrl.includes('magalu') ? 'Magazine Luiza' :
            productPageUrl.includes('casasbahia') ? 'Casas Bahia' :
            productPageUrl.includes('americanas') ? 'Americanas' : 'Internet';
        
        if (finalUrls.length === 0) {
            return Response.json({
                error: `Produto encontrado mas sem imagens disponíveis`,
                suggestion: "Use o importador por URL ou upload manual de imagens",
                title: title,
                description: description
            }, { status: 404 });
        }
        
        return Response.json({
            title: title.substring(0, 200),
            description: (description || 'Produto encontrado').substring(0, 500),
            imageUrls: finalUrls,
            marketplace: detectedMarketplace,
            sourceUrl: productPageUrl,
            searchTerm: productName
        }, { status: 200 });

    } catch (error) {
        console.error('❌', error);
        return Response.json({
            error: "Erro ao buscar produto",
            details: error.message
        }, { status: 500 });
    }
});