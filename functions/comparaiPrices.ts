import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// 🧹 LIMPEZA PROFUNDA DE TÍTULOS
function cleanProductTitle(title) {
    if (!title) return '';
    
    let clean = title;
    
    // Remove termos de leilão
    clean = clean.replace(/leil[aã]o\s*(no\s*zap|nozap)?/gi, '');
    clean = clean.replace(/\b(nozap|valora)\b/gi, '');
    
    // Remove condições
    clean = clean.replace(/\b(novo|usado|seminovo|recondicionado|open\s*box)\b/gi, '');
    
    // Remove voltagem
    clean = clean.replace(/\b(110v?|127v?|220v?|bivolt|240v?)\b/gi, '');
    
    // Remove cores no final
    clean = clean.replace(/\s+(preto|branco|vermelho|azul|verde|amarelo|cinza|rosa|roxo|laranja)$/gi, '');
    
    // Remove códigos
    clean = clean.replace(/\b[A-Z]{2,}-?\d{2,}\b/g, '');
    clean = clean.replace(/\bref\.?\s*\d+\b/gi, '');
    
    // Limpa caracteres
    clean = clean.replace(/[-_–—]+/g, ' ');
    clean = clean.replace(/\s+/g, ' ').trim();
    
    // Limita palavras
    const words = clean.split(' ').filter(w => w.length > 2);
    clean = words.slice(0, 6).join(' ');
    
    console.log(`🧹 "${title}" → "${clean}"`);
    return clean;
}

// 🚫 VALIDA PREÇO
function isValidPrice(price, currentPrice, productName) {
    if (!price || price < 5) {
        console.log(`🚫 Preço muito baixo: R$ ${price}`);
        return false;
    }
    
    // Rejeita preços genéricos
    const badPrices = [99.99, 199.99, 299.99, 399.99, 499.99, 599.99, 699.99, 799.99, 899.99, 999.99, 9999.99];
    if (badPrices.includes(price)) {
        console.log(`🚫 Preço genérico: R$ ${price}`);
        return false;
    }
    
    // Rejeita preços muito altos comparado ao lance
    if (currentPrice > 0 && price > currentPrice * 50) {
        console.log(`🚫 Preço muito alto: R$ ${price} vs Lance R$ ${currentPrice}`);
        return false;
    }
    
    // Rejeita promoções "Leve X Pague Y"
    if (productName && /leve\s*\d+\s*pague\s*\d+/gi.test(productName)) {
        console.log(`🚫 Promoção "Leve X Pague Y"`);
        return false;
    }
    
    // Rejeita kits
    if (productName && /kit\s+(com|de)?\s*\d+/gi.test(productName)) {
        console.log(`🚫 Kit múltiplo`);
        return false;
    }
    
    return true;
}

Deno.serve(async (req) => {
    console.log('\n🚀 ========== COMPARAI INICIADO ==========');
    
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { auctionId, forceRefresh = false } = body;

        console.log(`📦 AuctionID: ${auctionId}`);
        console.log(`♻️ ForceRefresh: ${forceRefresh}`);

        if (!auctionId) {
            console.log('❌ AuctionID não fornecido');
            return Response.json({ 
                success: false, 
                error: "auctionId é obrigatório" 
            }, { status: 400 });
        }

        // Busca leilão
        console.log('🔍 Buscando leilão...');
        const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
        
        if (!auctions || auctions.length === 0) {
            console.log('❌ Leilão não encontrado');
            return Response.json({ 
                success: false, 
                error: "Leilão não encontrado" 
            }, { status: 404 });
        }
        
        const auction = auctions[0];
        console.log(`✅ Leilão: ${auction.title}`);
        console.log(`💰 Preço atual: R$ ${auction.current_price || auction.starting_price}`);
        console.log(`🏷️ Categoria: ${auction.category}`);
        console.log(`🔧 Modo: ${auction.comparai_mode}`);

        // Verifica cache
        if (!forceRefresh && auction.market_price && auction.last_comparison_date) {
            const cacheAge = Date.now() - new Date(auction.last_comparison_date).getTime();
            const cacheLimit = 24 * 60 * 60 * 1000; // 24h
            
            if (cacheAge < cacheLimit) {
                console.log(`📦 Usando cache (${Math.floor(cacheAge / 1000 / 60)} minutos)`);
                const currentPrice = auction.current_price || auction.starting_price;
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
                    cached: true,
                    cacheAge: Math.floor(cacheAge / 1000 / 60)
                });
            }
        }

        const cleanTitle = cleanProductTitle(auction.title);
        const currentPrice = auction.current_price || auction.starting_price;

        if (!cleanTitle || cleanTitle.length < 3) {
            console.log('❌ Título muito curto após limpeza');
            return Response.json({
                success: false,
                error: "Título do produto inválido para busca",
                errorCode: "INVALID_TITLE"
            }, { status: 400 });
        }

        console.log(`🔎 Buscando no Google Shopping: "${cleanTitle}"`);
        console.log(`💵 Preço de referência: R$ ${currentPrice.toFixed(2)}`);

        // Busca com IA
        const searchPrompt = `Busque no Google Shopping Brasil: ${cleanTitle}

REGRAS CRÍTICAS:
1. APENAS produtos NOVOS de lojas confiáveis (Mercado Livre, Magazine Luiza, Amazon, Americanas, Casas Bahia, Shopee)
2. IGNORE promoções "Leve X Pague Y", kits múltiplos, combos
3. Preços REAIS entre R$ 20 e R$ 5000
4. Preço de referência do lance: R$ ${currentPrice.toFixed(2)}
5. Se não encontrar, retorne array vazio []
6. NÃO invente R$ 999,99 ou preços genéricos

Retorne JSON válido:
{
  "comparisons": [
    {"store": "Loja", "productNameFound": "Nome", "price": 129.90, "url": "https://..."}
  ]
}`;

        let llmResult = null;
        let attempts = 0;

        while (attempts < 2 && (!llmResult?.comparisons || llmResult.comparisons.length === 0)) {
            attempts++;
            console.log(`🔄 Tentativa ${attempts}...`);
            
            try {
                llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: searchPrompt,
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
                        },
                        required: ["comparisons"]
                    }
                });

                console.log(`📊 Resultado LLM: ${llmResult?.comparisons?.length || 0} resultados`);

                if (llmResult?.comparisons) {
                    // Filtra preços válidos
                    const validComparisons = llmResult.comparisons.filter(c => 
                        isValidPrice(c.price, currentPrice, c.productNameFound)
                    );

                    console.log(`✅ Preços válidos: ${validComparisons.length}`);

                    if (validComparisons.length > 0) {
                        llmResult.comparisons = validComparisons;
                        break;
                    }
                }

                if (attempts < 2) {
                    console.log('⏳ Aguardando antes de tentar novamente...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (error) {
                console.error(`❌ Erro tentativa ${attempts}:`, error.message);
                if (attempts === 2) throw error;
            }
        }

        const comparisons = llmResult?.comparisons || [];
        
        if (comparisons.length === 0) {
            console.log('❌ Nenhum resultado válido encontrado');
            return Response.json({
                success: false,
                error: "Não encontramos preços para comparar no momento.",
                errorCode: "NO_COMPARISONS"
            }, { status: 404 });
        }

        // Calcula economia
        const prices = comparisons.map(c => c.price);
        const minPrice = Math.min(...prices);
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const savings = minPrice - currentPrice;
        const savingsPercent = minPrice > 0 ? (savings / minPrice) * 100 : 0;

        console.log(`📊 Resultado:`);
        console.log(`   Lojas: ${comparisons.length}`);
        console.log(`   Menor: R$ ${minPrice.toFixed(2)}`);
        console.log(`   Média: R$ ${avgPrice.toFixed(2)}`);
        console.log(`   Economia: R$ ${savings.toFixed(2)} (${Math.round(savingsPercent)}%)`);

        // Valida economia
        if (Math.abs(savingsPercent) > 95) {
            console.log(`⚠️ Economia suspeita: ${savingsPercent}%`);
            return Response.json({
                success: false,
                error: "Comparação retornou dados inconsistentes. Tente novamente.",
                errorCode: "UNREALISTIC_SAVINGS"
            }, { status: 422 });
        }

        // Atualiza cache
        console.log('💾 Salvando cache...');
        await base44.asServiceRole.entities.Auction.update(auctionId, {
            market_price: minPrice,
            last_comparison_date: new Date().toISOString()
        });

        console.log('✅ Comparação concluída com sucesso!');

        return Response.json({
            success: true,
            comparison: {
                productName: auction.title,
                ourPrice: currentPrice,
                comparisons: comparisons,
                cheapestMarketPrice: minPrice,
                averageMarketPrice: avgPrice,
                savings: savings,
                savingsPercent: Math.round(savingsPercent),
                isFactoryDirect: false,
                totalStoresAnalyzed: comparisons.length,
                searchAttempts: attempts,
                priceLabel: 'Menor Preço do Mercado'
            },
            cached: false
        });

    } catch (error) {
        console.error('💥 ERRO CRÍTICO:', error.message);
        console.error('Stack:', error.stack);
        
        return Response.json({
            success: false,
            error: "Erro ao comparar preços: " + error.message,
            errorCode: "INTERNAL_ERROR",
            details: error.message
        }, { status: 500 });
    }
});