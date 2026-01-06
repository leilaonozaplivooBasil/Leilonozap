import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// 🧹 LIMPEZA DE TÍTULOS
function cleanTitle(title) {
    if (!title) return '';
    let clean = title.replace(/leil[aã]o\s*(nozap|no\s*zap)?/gi, '').replace(/\b(novo|usado)\b/gi, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    const words = clean.split(' ').filter(w => w.length > 2);
    return words.slice(0, 6).join(' ');
}

// 🚫 VALIDA PREÇO
function isValidPrice(price, currentPrice) {
    if (!price || price < 10) return false;
    const badPrices = [99.99, 199.99, 299.99, 399.99, 499.99, 599.99, 699.99, 799.99, 899.99, 999.99, 9999.99];
    if (badPrices.includes(price)) return false;
    if (currentPrice > 0 && price > currentPrice * 40) return false;
    return true;
}

Deno.serve(async (req) => {
    console.log('\n🔥 ========== COMPARAI PROCESSO ==========');
    
    try {
        const base44 = createClientFromRequest(req);
        const { auctionId, forceRefresh = false } = await req.json();

        if (!auctionId) {
            return Response.json({ success: false, error: "auctionId obrigatório" }, { status: 400 });
        }

        // 1️⃣ BUSCA LEILÃO
        console.log(`📦 Buscando leilão ${auctionId}...`);
        const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
        
        if (!auctions || auctions.length === 0) {
            return Response.json({ success: false, error: "Leilão não encontrado" }, { status: 404 });
        }
        
        const auction = auctions[0];
        const currentPrice = auction.current_price || auction.starting_price;
        
        console.log(`✅ Título: ${auction.title}`);
        console.log(`💰 Preço: R$ ${currentPrice}`);

        // 2️⃣ VERIFICA CACHE
        if (!forceRefresh && auction.market_price && auction.last_comparison_date) {
            const cacheAge = Date.now() - new Date(auction.last_comparison_date).getTime();
            if (cacheAge < 24 * 60 * 60 * 1000) {
                console.log(`📦 Usando cache`);
                const savings = auction.market_price - currentPrice;
                const savingsPercent = auction.market_price > 0 ? (savings / auction.market_price) * 100 : 0;
                
                return Response.json({
                    success: true,
                    comparison: {
                        productName: auction.title,
                        ourPrice: currentPrice,
                        cheapestMarketPrice: auction.market_price,
                        savings: savings,
                        savingsPercent: Math.round(savingsPercent),
                        isFactoryDirect: false,
                        totalStoresAnalyzed: 5,
                        priceLabel: 'Menor Preço do Mercado',
                        comparisons: []
                    },
                    cached: true
                });
            }
        }

        // 3️⃣ LIMPA TÍTULO
        const cleanedTitle = cleanTitle(auction.title);
        
        if (!cleanedTitle || cleanedTitle.length < 4) {
            console.log(`❌ Título inválido: "${cleanedTitle}"`);
            return Response.json({
                success: false,
                error: "Título do produto não é descritivo o suficiente para busca",
                errorCode: "INVALID_TITLE"
            }, { status: 400 });
        }

        console.log(`🔎 Busca: "${cleanedTitle}"`);

        // 4️⃣ BUSCA NO GOOGLE SHOPPING
        const prompt = `Busque PREÇOS REAIS no Google Shopping Brasil para: ${cleanedTitle}

⚠️ REGRAS OBRIGATÓRIAS:
- APENAS produtos NOVOS de lojas brasileiras REAIS (Mercado Livre, Magazine Luiza, Amazon, Americanas, Casas Bahia)
- Preço de referência do leilão: R$ ${currentPrice.toFixed(2)}
- JAMAIS retorne R$ 999,99 ou preços .99 genéricos
- JAMAIS invente preços - se não encontrar, retorne array vazio []
- IGNORE promoções múltiplas, kits, combos
- Preços entre R$ 20 e R$ 2000

Retorne:
{
  "comparisons": [
    {"store": "Nome Real da Loja", "productNameFound": "Nome Real do Produto", "price": 89.90, "url": "https://..."}
  ]
}`;

        let validResults = [];
        let attempts = 0;

        while (attempts < 2 && validResults.length === 0) {
            attempts++;
            console.log(`🔄 Tentativa ${attempts}/2`);
            
            try {
                const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: prompt,
                    add_context_from_internet: true,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            comparisons: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        store: { type: "string" },
                                        productNameFound: { type: "string" },
                                        price: { type: "number" },
                                        url: { type: "string" }
                                    },
                                    required: ["store", "price"]
                                }
                            }
                        }
                    }
                });

                const comparisons = result?.comparisons || [];
                console.log(`📊 Recebeu: ${comparisons.length} resultados`);

                // Filtra preços válidos
                validResults = comparisons.filter(c => isValidPrice(c.price, currentPrice));
                console.log(`✅ Válidos: ${validResults.length}`);

                if (validResults.length === 0 && attempts < 2) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (error) {
                console.error(`❌ Erro: ${error.message}`);
                if (attempts === 2) throw error;
            }
        }

        // 5️⃣ VALIDA RESULTADO
        if (validResults.length === 0) {
            console.log('❌ Sem resultados válidos');
            return Response.json({
                success: false,
                error: "Não encontramos preços reais para comparar no momento",
                errorCode: "NO_VALID_RESULTS"
            }, { status: 404 });
        }

        // 6️⃣ CALCULA ECONOMIA
        const prices = validResults.map(c => c.price);
        const minPrice = Math.min(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const savings = minPrice - currentPrice;
        const savingsPercent = minPrice > 0 ? (savings / minPrice) * 100 : 0;

        console.log(`💰 Menor: R$ ${minPrice} | Economia: ${Math.round(savingsPercent)}%`);

        // 7️⃣ VALIDA ECONOMIA
        if (Math.abs(savingsPercent) > 93) {
            console.log(`⚠️ Economia irrealista: ${savingsPercent}%`);
            return Response.json({
                success: false,
                error: "Dados inconsistentes detectados. Por favor, tente novamente.",
                errorCode: "UNREALISTIC_DATA"
            }, { status: 422 });
        }

        // 8️⃣ SALVA CACHE
        await base44.asServiceRole.entities.Auction.update(auctionId, {
            market_price: minPrice,
            last_comparison_date: new Date().toISOString()
        });

        console.log('✅ Sucesso!');

        // 9️⃣ RETORNA
        return Response.json({
            success: true,
            comparison: {
                productName: auction.title,
                ourPrice: currentPrice,
                comparisons: validResults,
                cheapestMarketPrice: minPrice,
                averageMarketPrice: avgPrice,
                savings: savings,
                savingsPercent: Math.round(savingsPercent),
                isFactoryDirect: false,
                totalStoresAnalyzed: validResults.length,
                searchAttempts: attempts,
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