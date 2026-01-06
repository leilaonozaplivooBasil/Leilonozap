import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { searchGoogleShopping } from './searchGoogleShopping.js';
import { fallbackSmartSearch } from './fallbackSmartSearch.js';

async function logStep(base44, auctionId, step, status, message, errorDetails = null, req = null) {
    const userAgent = req?.headers.get('user-agent') || 'unknown';
    const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
    
    const logData = {
        auction_id: auctionId,
        step: step,
        status: status,
        message: message,
        user_agent: userAgent,
        is_mobile: isMobile
    };
    
    if (errorDetails) {
        logData.error_details = errorDetails;
    }
    
    console.log(`🩺 [${step}] ${status.toUpperCase()}: ${message}`);
    
    try {
        await base44.asServiceRole.entities.ComparaiLog.create(logData);
    } catch (logError) {
        console.error('⚠️ Erro ao salvar log:', logError);
    }
}

// 🔥 EXTRAÇÃO DE JSON-LD
function extractFromJSONLD(html) {
    console.log('   🔍 Buscando JSON-LD...');
    
    try {
        const jsonLdMatches = html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
        
        for (const match of jsonLdMatches) {
            try {
                const jsonContent = match[1].trim();
                const data = JSON.parse(jsonContent);
                
                let product = null;
                if (data['@type'] === 'Product') {
                    product = data;
                } else if (data['@graph']) {
                    product = data['@graph'].find(item => item['@type'] === 'Product');
                }
                
                if (product && product.offers) {
                    const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
                    
                    const prices = [
                        offer.price,
                        offer.highPrice,
                        offer.lowPrice
                    ].filter(p => p && !isNaN(parseFloat(p))).map(p => parseFloat(p));
                    
                    if (prices.length > 0) {
                        const price = Math.max(...prices);
                        
                        if (price > 0) {
                            console.log(`   ✅ JSON-LD: R$ ${price.toFixed(2)}`);
                            return { price, method: 'json-ld', confidence: 'high' };
                        }
                    }
                }
            } catch (e) {
                // Ignora
            }
        }
    } catch (error) {
        console.log(`   ❌ Erro no JSON-LD: ${error.message}`);
    }
    
    console.log('   ❌ JSON-LD não encontrado');
    return null;
}

// 🔥 EXTRAÇÃO DE META TAGS
function extractFromMetaTags(html) {
    console.log('   🔍 Buscando meta tags...');
    
    const metaPatterns = [
        /<meta[^>]*property\s*=\s*["']product:price:amount["'][^>]*content\s*=\s*["']([^"']+)["']/gi,
        /<meta[^>]*property\s*=\s*["']og:price:amount["'][^>]*content\s*=\s*["']([^"']+)["']/gi,
        /<meta[^>]*itemprop\s*=\s*["']price["'][^>]*content\s*=\s*["']([^"']+)["']/gi,
        /<meta[^>]*name\s*=\s*["']price["'][^>]*content\s*=\s*["']([^"']+)["']/gi,
    ];
    
    const foundPrices = [];
    
    for (const pattern of metaPatterns) {
        const matches = [...html.matchAll(pattern)];
        for (const match of matches) {
            const priceStr = match[1].replace(',', '.');
            const price = parseFloat(priceStr);
            
            if (!isNaN(price) && price > 0) {
                foundPrices.push(price);
            }
        }
    }
    
    if (foundPrices.length > 0) {
        const price = Math.max(...foundPrices);
        console.log(`   ✅ Meta Tag: R$ ${price.toFixed(2)}`);
        return { price, method: 'meta-tag', confidence: 'high' };
    }
    
    console.log('   ❌ Meta tags não encontradas');
    return null;
}

// 🔥 BUSCA PREÇO VISUAL
function extractPriceWithContext(html, currentPrice, category) {
    console.log('   🔍 Buscando preço visual...');
    
    const CATEGORY_MAX_PRICES = {
        'eletronicos': 15000, 'eletrodomesticos': 10000, 'moveis_decoracao': 8000,
        'casa_jardim': 5000, 'ferramentas': 5000, 'roupas_acessorios': 2000,
        'esportes_lazer': 5000, 'brinquedos_hobbies': 3000, 'livros_midia': 1000,
        'veiculos_pecas': 20000, 'instrumentos_musicais': 10000, 'beleza_cuidado_pessoal': 1000,
        'outros': 5000
    };
    
    const maxAllowed = CATEGORY_MAX_PRICES[category] || 5000;
    
    let cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    const contextPatterns = [
        /<span[^>]*class="[^"]*woocommerce-Price-amount[^"]*"[^>]*>.*?R\$\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/gi,
        /<[^>]*(?:class|id)="[^"]*(?:price|preco|valor|amount)[^"]*"[^>]*>.*?R\$\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/gi,
        /R\$\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g,
    ];
    
    const foundPrices = [];
    
    for (const pattern of contextPatterns) {
        const matches = [...cleanHtml.matchAll(pattern)];
        
        for (const match of matches) {
            let priceStr = match[1];
            if (!priceStr) continue;
            
            priceStr = priceStr.replace(/\./g, '').replace(',', '.');
            const price = parseFloat(priceStr);
            
            if (isNaN(price)) continue;
            if (price < 10) continue;
            if (price > maxAllowed) continue;
            
            const ratio = price / currentPrice;
            if (ratio < 0.5 || ratio > 100) continue;
            
            foundPrices.push(price);
        }
    }
    
    if (foundPrices.length > 0) {
        const frequency = {};
        foundPrices.forEach(price => {
            const key = price.toFixed(2);
            frequency[key] = (frequency[key] || 0) + 1;
        });
        
        const maxFreq = Math.max(...Object.values(frequency));
        const mostFrequent = Object.keys(frequency)
            .filter(key => frequency[key] === maxFreq)
            .map(key => parseFloat(key));
        
        const price = Math.max(...mostFrequent);
        
        console.log(`   ✅ Preço visual: R$ ${price.toFixed(2)} (aparece ${maxFreq}x)`);
        return { price, method: 'visual', confidence: maxFreq > 2 ? 'high' : 'medium' };
    }
    
    console.log('   ❌ Preço visual não encontrado');
    return null;
}

Deno.serve(async (req) => {
    const startTime = Date.now();
    let auctionId = 'unknown';
    let base44;
    
    try {
        console.log('🟦 CHECKPOINT 1: Função iniciada');
        base44 = createClientFromRequest(req);
        console.log('🟦 CHECKPOINT 2: Base44 client criado');
        
        let user = null;
        try {
            user = await base44.auth.me();
        } catch (authError) {
            console.log('Sem autenticação, usando serviceRole');
        }

        console.log('🟦 CHECKPOINT 3: Parseando body...');
        const body = await req.json();
        console.log('🟦 CHECKPOINT 4: Body =', JSON.stringify(body));
        
        const { auctionId: reqAuctionId, forceRefresh, title: bodyTitle, imageUrl: bodyImageUrl, forceGoogleShopping } = body;
        auctionId = reqAuctionId || 'no-id';
        console.log('🟦 CHECKPOINT 5: auctionId =', auctionId);

        if (!auctionId || auctionId === 'no-id') {
            return Response.json({ error: "auctionId é obrigatório", errorCode: "INVALID_DATA" }, { status: 400 });
        }

        console.log('🟦 CHECKPOINT 6: Buscando auction...');
        const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
        console.log('🟦 CHECKPOINT 7: Auctions =', auctions?.length || 0);
        
        if (!auctions || auctions.length === 0) {
            console.log('❌ CHECKPOINT 8: Auction não encontrado!');
            return Response.json({ error: "Leilão não encontrado", errorCode: "AUCTION_NOT_FOUND" }, { status: 404 });
        }
        
        const auction = auctions[0];
        const productTitle = auction.title;
        const validCurrentPrice = auction.current_price || auction.starting_price;
        const category = auction.category || 'outros';

        if (!productTitle || !validCurrentPrice) {
            return Response.json({ error: "Dados inválidos", errorCode: "INVALID_AUCTION_DATA" }, { status: 400 });
        }

        const CATEGORY_MAX_PRICES = {
            'eletronicos': 15000, 'eletrodomesticos': 10000, 'moveis_decoracao': 8000,
            'casa_jardim': 5000, 'ferramentas': 5000, 'roupas_acessorios': 2000,
            'esportes_lazer': 5000, 'brinquedos_hobbies': 3000, 'livros_midia': 1000,
            'veiculos_pecas': 20000, 'instrumentos_musicais': 10000, 'beleza_cuidado_pessoal': 1000,
            'outros': 5000
        };
        const maxAllowedPrice = CATEGORY_MAX_PRICES[category] || 5000;
        const comparaiMode = auction.comparai_mode || 'google_shopping';
        const manualMarketPrice = auction.manual_market_price;

        console.log(`\n🔍 MODO COMPARAI: ${comparaiMode}`);
        console.log(`🔍 FORCE GOOGLE SHOPPING: ${forceGoogleShopping}`);
        console.log(`🔍 PREÇO MANUAL: ${manualMarketPrice || 'Não definido'}`);

        // ═══════════════════════════════════════════════════════════════
        // PRIORIDADE 0: SE TEM PREÇO MANUAL, USA ELE DIRETO
        // ═══════════════════════════════════════════════════════════════
        if (manualMarketPrice && manualMarketPrice > 0) {
            console.log(`\n✏️ ═══ USANDO PREÇO MANUAL: R$ ${manualMarketPrice} ═══`);
            
            const savings = manualMarketPrice - validCurrentPrice;
            const savingsPercent = (savings / manualMarketPrice) * 100;
            const isExpensive = validCurrentPrice > manualMarketPrice;
            
            return Response.json({
                success: true,
                comparison: {
                    productName: productTitle,
                    ourPrice: validCurrentPrice,
                    comparisons: [{
                        store: 'Preço de Referência',
                        productNameFound: productTitle,
                        price: manualMarketPrice,
                        url: null,
                        isManual: true
                    }],
                    cheapestMarketPrice: manualMarketPrice,
                    savings: savings,
                    savingsPercent: parseFloat(savingsPercent.toFixed(0)),
                    isFactoryDirect: comparaiMode === 'supplier',
                    isManualPrice: true,
                    isExpensive: isExpensive,
                    priceLabel: 'Preço de Mercado (Manual)'
                },
                cached: false
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // NOVO: SE forceGoogleShopping=true, USA DIRETO O GOOGLE SHOPPING
        // (Mesmo código do módulo Arremate - SEM ALTERAÇÕES)
        // ═══════════════════════════════════════════════════════════════
        if (forceGoogleShopping === true) {
            console.log(`\n🔥 ═══ FORÇANDO GOOGLE SHOPPING (BOTÃO ALTERNATIVO) ═══`);
            
            const googleShoppingResult = await searchGoogleShopping({
                base44,
                productTitle,
                validCurrentPrice,
                category
            });

            if (!googleShoppingResult.success) {
                return Response.json(googleShoppingResult, { status: 200 });
            }

            return Response.json({
                success: true,
                comparison: googleShoppingResult.comparison,
                cached: false
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // MÓDULO 2: PRODUTO DE FÁBRICA COM URL (NÃO ALTERAR)
        // ═══════════════════════════════════════════════════════════════
        if (comparaiMode === 'supplier' && auction.source_url && auction.source_url.trim()) {
            console.log(`\n🏭 ═══ PRODUTO DE FÁBRICA COM URL ═══`);
            console.log(`📦 ${productTitle}`);
            console.log(`🔗 ${auction.source_url}`);
            
            let supplierPrice = null;
            let extractionMethod = null;
            
            try {
                const response = await fetch(auction.source_url, {
                    headers: { 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html',
                        'Accept-Language': 'pt-BR'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const html = await response.text();
                
                // 🆕 PRIORIDADE 1: IA PRIMEIRO (mais precisa)
                console.log(`   🤖 Tentando IA (prioridade máxima)...`);

                try {
                    const htmlSnippet = html.substring(0, 50000);

                    const llmPrompt = `Você é um extrator de preços especializado. Analise o HTML e extraia o preço de venda atual do produto.

                PRODUTO: "${productTitle}"
                CATEGORIA: ${category}

                HTML DA PÁGINA:
                ${htmlSnippet}

                INSTRUÇÕES CRÍTICAS:
                - Busque o preço de venda À VISTA (não parcelado)
                - IGNORE preços riscados/antigos
                - IGNORE preços de frete
                - IGNORE ofertas "compre 2 leve 3"
                - O preço deve estar entre R$ 10,00 e R$ ${maxAllowedPrice.toFixed(2)}
                - Se encontrar múltiplos preços, escolha o maior (preço sem desconto)

                Retorne JSON:
                {
                "price": 999.99,
                "confidence": "high",
                "found": true
                }`;

                    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
                        prompt: llmPrompt,
                        add_context_from_internet: false,
                        response_json_schema: {
                            type: "object",
                            properties: {
                                price: { type: ["number", "null"] },
                                confidence: { type: "string" },
                                found: { type: "boolean" }
                            }
                        }
                    });

                    if (llmResult?.found && llmResult.price && llmResult.price >= 10 && llmResult.price <= maxAllowedPrice * 2) {
                        supplierPrice = llmResult.price;
                        extractionMethod = 'ai-extraction';
                        console.log(`   ✅ IA extraiu: R$ ${supplierPrice.toFixed(2)} (confiança: ${llmResult.confidence})`);
                    } else {
                        console.log(`   ⚠️ IA não encontrou preço válido, tentando métodos tradicionais...`);
                    }
                } catch (aiError) {
                    console.log(`   ⚠️ Erro na IA, usando fallback: ${aiError.message}`);
                }
                
                // PRIORIDADE 2: JSON-LD (fallback)
                if (!supplierPrice) {
                    const jsonLdResult = extractFromJSONLD(html);
                    if (jsonLdResult) {
                        supplierPrice = jsonLdResult.price;
                        extractionMethod = jsonLdResult.method;
                    }
                }
                
                // PRIORIDADE 3: Meta Tags (fallback)
                if (!supplierPrice) {
                    const metaResult = extractFromMetaTags(html);
                    if (metaResult) {
                        supplierPrice = metaResult.price;
                        extractionMethod = metaResult.method;
                    }
                }
                
                // PRIORIDADE 4: Extração visual (último recurso)
                if (!supplierPrice) {
                    const visualResult = extractPriceWithContext(html, validCurrentPrice, category);
                    if (visualResult) {
                        supplierPrice = visualResult.price;
                        extractionMethod = visualResult.method;
                    }
                }
                
            } catch (error) {
                console.error(`❌ Erro ao acessar fabricante:`, error);
            }
            
            // SE CONSEGUIU EXTRAIR DO FABRICANTE
            if (supplierPrice && supplierPrice > 0) {
                const savings = supplierPrice - validCurrentPrice;
                const savingsPercent = (savings / supplierPrice) * 100;

                const urlObj = new URL(auction.source_url);
                const supplierName = urlObj.hostname.replace('www.', '').split('.')[0];
                const capitalizedName = supplierName.charAt(0).toUpperCase() + supplierName.slice(1);
                
                const isExpensive = validCurrentPrice > supplierPrice;
                
                return Response.json({
                    success: true,
                    comparison: {
                        productName: productTitle,
                        ourPrice: validCurrentPrice,
                        comparisons: [{
                            store: capitalizedName,
                            productNameFound: productTitle,
                            price: supplierPrice,
                            url: auction.source_url,
                            isSupplier: true
                        }],
                        cheapestMarketPrice: supplierPrice,
                        savings: savings,
                        savingsPercent: parseFloat(savingsPercent.toFixed(0)),
                        isFactoryDirect: true,
                        supplierUrl: auction.source_url,
                        extractionMethod: extractionMethod,
                        isExpensive: isExpensive,
                        priceLabel: 'Preço no Fabricante'
                    },
                    cached: false
                });
            }
            
            // SE NÃO CONSEGUIU, FAZ FALLBACK PARA GOOGLE SHOPPING
            console.log(`⚠️ Preço não encontrado no fabricante. Usando fallback Google Shopping...`);
        }

        // ═══════════════════════════════════════════════════════════════
        // MÓDULO 3: FALLBACK SMART SEARCH (FORNECEDOR SEM URL)
        // ═══════════════════════════════════════════════════════════════
        if (comparaiMode === 'supplier' && (!auction.source_url || !auction.source_url.trim())) {
            console.log(`\n🔄 ═══ FORNECEDOR SEM URL - USANDO FALLBACK SMART SEARCH ═══`);
            
            const fallbackResult = await fallbackSmartSearch({
                base44,
                productTitle: bodyTitle || productTitle,
                validCurrentPrice,
                category,
                imageUrl: bodyImageUrl
            });

            if (!fallbackResult.success) {
                return Response.json(fallbackResult, { status: 200 });
            }

            return Response.json({
                success: true,
                comparison: fallbackResult.comparison,
                cached: false
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // MÓDULO 1: PRODUTOS DE ARREMATE - GOOGLE SHOPPING (NÃO ALTERAR)
        // ═══════════════════════════════════════════════════════════════
        console.log(`\n🔥 ═══ PRODUTOS DE ARREMATE - GOOGLE SHOPPING ═══`);
        
        const googleShoppingResult = await searchGoogleShopping({
            base44,
            productTitle,
            validCurrentPrice,
            category
        });

        if (!googleShoppingResult.success) {
            return Response.json(googleShoppingResult, { status: 200 });
        }

        return Response.json({
            success: true,
            comparison: googleShoppingResult.comparison,
            cached: false
        });

    } catch (error) {
        console.error('❌ CHECKPOINT ERROR: ERRO CAPTURADO');
        console.error('❌ Error:', error);
        console.error('❌ Message:', error?.message);
        console.error('❌ Stack:', error?.stack);
        console.error('❌ Name:', error?.name);
        console.error('❌ Details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

        // Se for erro da IA ou rate limit, retorna mensagem específica
        if (error.message?.includes('rate') || error.message?.includes('limit')) {
            return Response.json({
                success: false,
                error: "Sistema temporariamente sobrecarregado. Tente novamente em 30 segundos.",
                errorCode: 'RATE_LIMIT'
            }, { status: 200 });
        }

        return Response.json({
            success: false,
            error: "Não foi possível comparar preços no momento. Tente novamente.",
            errorCode: 'FATAL_ERROR',
            details: error.message
        }, { status: 200 });
    }
});