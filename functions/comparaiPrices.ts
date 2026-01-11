import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// 🧹 LIMPEZA DE TÍTULOS - VERSÃO MELHORADA
function cleanTitle(title) {
    if (!title) return '';
    
    // Remove termos irrelevantes
    let clean = title
        .replace(/leil[aã]o\s*(nozap|no\s*zap)?/gi, '')
        .replace(/\b(novo|usado|semi[-\s]?novo|original|lacrado|garantia|frete\s*gr[aá]tis)\b/gi, '')
        .replace(/\b(arremate|devolu[çc][aã]o|promo[çc][aã]o)\b/gi, '')
        .replace(/\b(110v|220v|bivolt)\b/gi, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Pega palavras significativas (mínimo 2 caracteres)
    const words = clean.split(' ').filter(w => w.length > 1);
    
    // Retorna até 8 palavras para melhor precisão na busca
    return words.slice(0, 8).join(' ');
}

// 🚫 VALIDA PREÇO - VERSÃO MAIS FLEXÍVEL
function isValidPrice(price, currentPrice) {
    if (!price || price < 5) return false; // Aceita preços a partir de R$5
    if (price > 500000) return false; // Preço máximo razoável
    
    // Removido filtro de "badPrices" - preços redondos são comuns
    // Removido limite de 40x - muito restritivo para produtos baratos
    
    return true;
}

Deno.serve(async (req) => {
    console.log('\n🔥 ========== COMPARAI PROCESSO ==========');
    
    try {
        const base44 = createClientFromRequest(req);
        const { auctionId, productId, forceRefresh = false, forceGoogleShopping = false } = await req.json();

        if (!auctionId && !productId) {
            return Response.json({ success: false, error: "auctionId ou productId obrigatório" }, { status: 400 });
        }

        let searchTitle, currentPrice, entityId, isProduct = false;

        // 1️⃣ BUSCA LEILÃO OU PRODUTO
        if (auctionId) {
            console.log(`📦 Buscando leilão ${auctionId}...`);
            const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
            
            if (!auctions || auctions.length === 0) {
                return Response.json({ success: false, error: "Leilão não encontrado" }, { status: 404 });
            }
            
            const auction = auctions[0];
            currentPrice = auction.current_price || auction.starting_price;
            searchTitle = auction.title;
            entityId = auctionId;
            console.log(`✅ Título: ${searchTitle}`);
        } else {
            console.log(`📦 Buscando produto ${productId}...`);
            const products = await base44.asServiceRole.entities.Product.filter({ id: productId });
            
            if (!products || products.length === 0) {
                return Response.json({ success: false, error: "Produto não encontrado" }, { status: 404 });
            }
            
            const product = products[0];
            currentPrice = product.price_catalog || product.selling_price_retail || 0;
            searchTitle = product.description;
            entityId = productId;
            isProduct = true;
            console.log(`✅ Título: ${searchTitle}`);
        }

        console.log(`💰 Preço: R$ ${currentPrice}`);

        // 2️⃣ PARA PRODUTOS, SEMPRE USA GOOGLE SHOPPING
        let useGoogleShopping = forceGoogleShopping || isProduct;

        // 3️⃣ SE NÃO FOR USAR GOOGLE SHOPPING, TENTA SUPPLIER (APENAS AUCTIONS)
        if (!useGoogleShopping && auctionId) {
            const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
            const auction = auctions[0];

            if (auction.comparai_mode === 'supplier' && auction.source_url) {
                console.log(`🏭 MODO FABRICANTE ATIVADO`);
                console.log(`📍 URL: ${auction.source_url}`);

                try {
                    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
                        prompt: `Você está extraindo o PREÇO EXATO de um produto direto do fabricante.

        URL DO PRODUTO: ${auction.source_url}
        NOME DO PRODUTO: ${auction.title}
        PREÇO DO LEILÃO (referência): R$ ${currentPrice.toFixed(2)}

        ⚠️ REGRAS OBRIGATÓRIAS:
        - Acesse a URL e extraia o preço REAL que está sendo vendido
        - Se houver múltiplas variações (voltagem, cor), retorne o preço da mais barata
        - JAMAIS invente preços - se não conseguir acessar, retorne null
        - Extraia também o nome EXATO da loja/fabricante do site
        - Se possível, identifique a logo do fornecedor (procure por <img> com "logo" no alt ou class)

        Retorne EXATAMENTE este formato:
        {
        "store": "Nome Exato da Loja/Fabricante",
        "productNameFound": "Nome do Produto no Site",
        "price": 99.90,
        "url": "${auction.source_url}",
        "logo_url": "URL da logo se encontrada, senão null"
        }`,
                        add_context_from_internet: true,
                        response_json_schema: {
                            type: "object",
                            properties: {
                                store: { type: "string" },
                                productNameFound: { type: "string" },
                                price: { type: ["number", "null"] },
                                url: { type: "string" },
                                logo_url: { type: ["string", "null"] }
                            },
                            required: ["store", "price", "url"]
                        }
                    });

                    if (!result || result.price === null || result.price < 10) {
                        console.log(`⚠️ Falha na extração do fabricante, tentando Google Shopping...`);
                        useGoogleShopping = true;
                    } else {

                    console.log(`✅ Preço extraído: R$ ${result.price}`);
                    console.log(`🏪 Loja: ${result.store}`);

                    const savings = result.price - currentPrice;
                    const savingsPercent = result.price > 0 ? (savings / result.price) * 100 : 0;

                    console.log(`💰 Economia: ${Math.round(savingsPercent)}%`);

                    // Valida economia - MAIS FLEXÍVEL
                    if (savingsPercent > 99 || savingsPercent < -500) {
                        console.log(`⚠️ Economia fora do range: ${savingsPercent}%`);
                        return Response.json({
                            success: false,
                            error: "Dados inconsistentes detectados. Por favor, tente novamente.",
                            errorCode: "UNREALISTIC_DATA"
                        }, { status: 422 });
                    }

                    // Salva cache + logo se encontrada
                    const updateData = {
                        market_price: result.price,
                        last_comparison_date: new Date().toISOString()
                    };

                    if (result.logo_url) {
                        updateData.supplier_logo_url = result.logo_url;
                    }

                    await base44.asServiceRole.entities.Auction.update(auctionId, updateData);

                    console.log('✅ Sucesso modo fabricante!');

                    return Response.json({
                        success: true,
                        comparison: {
                            productName: searchTitle,
                            ourPrice: currentPrice,
                            comparisons: [result],
                            cheapestMarketPrice: result.price,
                            averageMarketPrice: result.price,
                            savings: savings,
                            savingsPercent: Math.round(savingsPercent),
                            isFactoryDirect: true,
                            totalStoresAnalyzed: 1,
                            searchAttempts: 1,
                            priceLabel: 'Preço no Fabricante'
                        },
                        cached: false
                    });
                    }

                } catch (error) {
                    console.error('⚠️ Erro modo fabricante, tentando Google Shopping:', error.message);
                    useGoogleShopping = true;
                }
            }
        }

        // 4️⃣ LIMPA TÍTULO (modo Google Shopping)
        const cleanedTitle = cleanTitle(searchTitle);

        if (!cleanedTitle || cleanedTitle.length < 4) {
            console.log(`❌ Título inválido: "${cleanedTitle}"`);
            return Response.json({
                success: false,
                error: "Título do produto não é descritivo o suficiente para busca",
                errorCode: "INVALID_TITLE"
            }, { status: 400 });
        }

        console.log(`🔎 Busca Google Shopping via SerpAPI: "${cleanedTitle}"`);

        // 5️⃣ BUSCA NO GOOGLE SHOPPING VIA SERPAPI
        const serpApiKey = Deno.env.get('SERPAPI_KEY');
        if (!serpApiKey) {
            throw new Error('SERPAPI_KEY não configurada');
        }

        const searchUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(cleanedTitle)}&location=Brazil&hl=pt&gl=br&api_key=${serpApiKey}`;
        
        console.log('🔍 Chamando SerpAPI...');
        
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error(`SerpAPI error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.shopping_results || data.shopping_results.length === 0) {
            console.log('❌ Sem resultados no Google Shopping');
            return Response.json({
                success: false,
                error: "Não encontramos preços reais para comparar no momento",
                errorCode: "NO_VALID_RESULTS"
            }, { status: 404 });
        }

        // Formata resultados do SerpAPI
        const validResults = data.shopping_results
            .slice(0, 10)
            .map(result => {
                const price = result.extracted_price || parseFloat(result.price?.replace(/[^\d,]/g, '').replace(',', '.'));
                return {
                    store: result.source || 'Loja',
                    productNameFound: result.title,
                    price: price,
                    url: result.product_link || result.link || '#'
                };
            })
            .filter(c => isValidPrice(c.price, currentPrice));

        console.log(`✅ SerpAPI retornou ${validResults.length} produtos válidos`);

        // 6️⃣ VALIDA RESULTADO
        if (validResults.length === 0) {
            console.log('❌ Sem resultados válidos');
            return Response.json({
                success: false,
                error: "Não encontramos preços reais para comparar no momento",
                errorCode: "NO_VALID_RESULTS"
            }, { status: 404 });
        }

        // 7️⃣ CALCULA ECONOMIA
        const prices = validResults.map(c => c.price);
        const minPrice = Math.min(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const savings = minPrice - currentPrice;
        const savingsPercent = minPrice > 0 ? (savings / minPrice) * 100 : 0;

        console.log(`💰 Menor: R$ ${minPrice} | Economia: ${Math.round(savingsPercent)}%`);

        // 8️⃣ VALIDA ECONOMIA - MAIS FLEXÍVEL
        // Permite economias de até 98% (produtos de arremate podem ter descontos enormes)
        if (savingsPercent > 99 || savingsPercent < -500) {
            console.log(`⚠️ Economia fora do range: ${savingsPercent}%`);
            return Response.json({
                success: false,
                error: "Dados inconsistentes detectados. Por favor, tente novamente.",
                errorCode: "UNREALISTIC_DATA"
            }, { status: 422 });
        }

        // 9️⃣ SALVA CACHE (apenas para auctions, não para produtos)
        if (auctionId) {
            await base44.asServiceRole.entities.Auction.update(auctionId, {
                market_price: minPrice,
                last_comparison_date: new Date().toISOString()
            });
        }

        console.log('✅ Sucesso!');

        // 🔟 RETORNA
        return Response.json({
            success: true,
            comparison: {
                productName: searchTitle,
                ourPrice: currentPrice,
                comparisons: validResults,
                cheapestMarketPrice: minPrice,
                averageMarketPrice: avgPrice,
                savings: savings,
                savingsPercent: Math.round(savingsPercent),
                isFactoryDirect: false,
                totalStoresAnalyzed: validResults.length,
                searchAttempts: 1,
                priceLabel: 'Menor Preço do Mercado'
            },
            cached: false
        });

    } catch (error) {
        console.error('💥 ERRO:', error.message);
        return Response.json({
            success: false,
            error: "Erro ao processar comparação",
            details: error.message
        }, { status: 500 });
    }
});