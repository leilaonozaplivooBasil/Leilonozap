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

        // 3️⃣ SE FOR AUCTION, BUSCA DADOS PARA VERIFICAR MODO
        let auction = null;
        if (auctionId) {
            const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
            auction = auctions[0];
            
            // 🆕 SE FOR DIRETO DE FÁBRICA, PRIORIZA MODO SUPPLIER
            if (auction.product_source === 'factory_new' && auction.source_url) {
                console.log(`✨ PRODUTO DIRETO DE FÁBRICA DETECTADO`);
                useGoogleShopping = false;
            }
        }

        // 4️⃣ SE NÃO FOR USAR GOOGLE SHOPPING, TENTA SUPPLIER (APENAS AUCTIONS)
        if (!useGoogleShopping && auctionId && auction) {
            if ((auction.comparai_mode === 'supplier' || auction.product_source === 'factory_new') && auction.source_url) {
                console.log(`🏭 MODO FABRICANTE ATIVADO`);
                console.log(`📍 URL: ${auction.source_url}`);

                try {
                    console.log(`🔍 Extraindo preço da URL do fornecedor...`);
                    
                    // ⏱️ TIMEOUT DE 10 SEGUNDOS
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('LLM timeout')), 10000)
                    );

                    const llmPromise = base44.asServiceRole.integrations.Core.InvokeLLM({
                        prompt: `🏭 MISSÃO CRÍTICA: EXTRAIR PREÇO DO SITE DO FABRICANTE/FORNECEDOR

📍 URL: ${auction.source_url}
🏷️ PRODUTO: ${searchTitle}

🎯 OBJETIVO:
Encontre o preço PRINCIPAL do produto nesta página (seja à vista, parcelado ou preço único).

⚠️ REGRAS DE EXTRAÇÃO:

1️⃣ PROCURE O PREÇO PRINCIPAL:
   ✅ Preço maior/destaque perto do botão "Comprar"
   ✅ Valor com "R$" em fonte grande
   ✅ Pode ser "à vista", "no PIX", ou preço único
   ✅ Se houver "De R$ X por R$ Y" → pegue Y (preço promocional)

2️⃣ IGNORE COMPLETAMENTE:
   ❌ Códigos de produto (1197, SKU, REF)
   ❌ Valores de parcelas individuais ("12x de R$ 50")
   ❌ Preços riscados (descarte o valor antigo)
   ❌ Números SEM "R$"

3️⃣ SITES COMUNS:
   • Laura Novaes/Lojas de Roupa: Preço abaixo do título, geralmente "R$ XXX,00" ou "Parcele em 3x de R$ YY sem juros"
   • Mercado Livre: "R$ XXX" em destaque
   • Amazon/Shopee: Preço principal em grande

📊 EXEMPLOS:

Exemplo 1 - Laura Novaes:
"Body Vênus - Rubro
R$ 209,00
Parcele em 3x de R$ 69,67 sem juros"
→ RESPOSTA: 209.00 (preço total, NÃO a parcela)

Exemplo 2 - Mercado Livre:
"R$ 450 à vista
ou 12x de R$ 45"
→ RESPOSTA: 450.00

Exemplo 3 - Loja qualquer:
"De R$ 299 por R$ 189"
→ RESPOSTA: 189.00

🔥 ATENÇÃO CRÍTICA:
- Se ver "3x de R$ 69,67", calcule: 69.67 × 3 = 209.00
- Se ver apenas "R$ 209,00", retorne 209.00
- NÃO retorne o valor da parcela, retorne o PREÇO TOTAL

RETORNE APENAS JSON:
{
  "store": "nome da loja/site",
  "price": 209.00,
  "productNameFound": "nome exato do produto encontrado"
}`,
                        add_context_from_internet: true,
                        response_json_schema: {
                            type: "object",
                            properties: {
                                store: { type: "string" },
                                productNameFound: { type: "string" },
                                price: { type: "number" },
                                url: { type: "string" }
                            },
                            required: ["store", "price"]
                        }
                    });

                    const result = await Promise.race([llmPromise, timeoutPromise]);

                    if (!result?.price || result.price < 1) {
                        console.log(`❌ Falha na extração (preço: ${result?.price})`);
                        useGoogleShopping = true;
                    } else {
                        console.log(`✅ Preço extraído: R$ ${result.price.toFixed(2)} - ${result.store}`);

                        const savings = result.price - currentPrice;
                        const savingsPercent = (savings / result.price) * 100;

                        console.log(`💰 Economia: ${Math.round(savingsPercent)}%`);

                        if (savingsPercent > 99 || savingsPercent < -500) {
                            console.log(`⚠️ Economia ${Math.round(savingsPercent)}% fora do range`);
                            useGoogleShopping = true;
                        } else {
                            await base44.asServiceRole.entities.Auction.update(auctionId, {
                                market_price: result.price,
                                last_comparison_date: new Date().toISOString()
                            });

                            console.log(`✅ SUCESSO MODO FABRICANTE!`);

                            return Response.json({
                                success: true,
                                comparison: {
                                    productName: searchTitle,
                                    ourPrice: currentPrice,
                                    comparisons: [{
                                        store: result.store,
                                        productNameFound: result.productNameFound || searchTitle,
                                        price: result.price,
                                        url: auction.source_url
                                    }],
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
                    }

                } catch (error) {
                    console.error(`❌ Erro modo fabricante: ${error.message}`);
                    
                    // Se timeout ou erro, cai para Google Shopping
                    if (error.message.includes('timeout') || error.message.includes('LLM timeout')) {
                        console.log(`⏱️ Timeout detectado, caindo para Google Shopping`);
                    }
                    
                    useGoogleShopping = true;
                }
            }
        }

        // 5️⃣ LIMPA TÍTULO (modo Google Shopping)
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

        // Formata resultados do SerpAPI - FILTRA POR RELEVÂNCIA
        const validResults = data.shopping_results
            .slice(0, 15)
            .map(result => {
                const price = result.extracted_price || parseFloat(result.price?.replace(/[^\d,]/g, '').replace(',', '.'));
                return {
                    store: result.source || 'Loja',
                    productNameFound: result.title || '',
                    price: price,
                    url: result.product_link || result.link || '#'
                };
            })
            .filter(c => {
                // Validação básica de preço
                if (!isValidPrice(c.price, currentPrice)) return false;
                
                // 🆕 FILTRA PRODUTOS IRRELEVANTES
                // Extrai palavras-chave do título original (marca + modelo)
                const titleWords = cleanedTitle.toLowerCase().split(' ').filter(w => w.length > 2);
                const foundWords = c.productNameFound.toLowerCase();
                
                // Conta quantas palavras do título original aparecem no resultado
                const matchCount = titleWords.filter(word => foundWords.includes(word)).length;
                const matchRatio = titleWords.length > 0 ? matchCount / titleWords.length : 0;
                
                // 🆕 FLEXIBILIZA FILTRO: 30% ao invés de 40%
                if (matchRatio < 0.3) {
                    console.log(`❌ Filtrado (baixa relevância ${Math.round(matchRatio*100)}%): ${c.productNameFound} - R$ ${c.price}`);
                    return false;
                }
                
                console.log(`✅ Aceito (${Math.round(matchRatio*100)}% match): ${c.productNameFound} - R$ ${c.price}`);
                return true;
            });

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

        // 7️⃣ CALCULA ECONOMIA - USA PREÇO MÉDIO COMO REFERÊNCIA
        const prices = validResults.map(c => c.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        
        // 🆕 USA PREÇO MÉDIO para comparação (mais justo)
        const referencePrice = avgPrice;
        const savings = referencePrice - currentPrice;
        const savingsPercent = referencePrice > 0 ? (savings / referencePrice) * 100 : 0;
        
        console.log(`📊 Preços encontrados: Min R$ ${minPrice.toFixed(2)} | Médio R$ ${avgPrice.toFixed(2)} | Max R$ ${maxPrice.toFixed(2)}`);

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

        // 🔟 RETORNA - USA PREÇO MÉDIO COMO REFERÊNCIA
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
                priceLabel: 'Preço Médio do Mercado',
                referencePrice: referencePrice // 🆕 Preço usado na comparação
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