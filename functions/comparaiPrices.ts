import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Browserbase from 'npm:@browserbasehq/sdk@3.5.3';

// 🧹 LIMPEZA AVANÇADA DE TÍTULOS
function advancedTitleCleanup(title) {
    if (!title) return title;
    
    let cleaned = title;
    
    // Remove termos de leilão e marketplace
    cleaned = cleaned.replace(/leil[aã]o\s*(no\s*zap|nozap|valora)?\s*[-:–]?\s*/gi, '');
    cleaned = cleaned.replace(/\b(nozap|valora|marketplace)\b\s*[-:–]?\s*/gi, '');
    
    // Remove condições de produto
    cleaned = cleaned.replace(/\b(novo|usado|seminovo|recondicionado|open\s*box)\b\s*/gi, '');
    
    // Remove voltagem e especificações técnicas genéricas
    cleaned = cleaned.replace(/\b(110v?|127v?|220v?|bivolt|240v?)\b\s*/gi, '');
    cleaned = cleaned.replace(/\b\d+\s*(watts?|w|volts?|v|amperes?|a)\b\s*/gi, '');
    
    // Remove cores no final
    cleaned = cleaned.replace(/\s+(preto|branco|vermelho|azul|verde|amarelo|cinza|rosa|roxo|laranja|dourado|prateado)$/gi, '');
    
    // Remove kits e acessórios
    cleaned = cleaned.replace(/\s*[-–]\s*(com|c\/)\s+(maleta|kit|acessórios|brindes?|garantia)\b/gi, '');
    cleaned = cleaned.replace(/\s*\+\s*(maleta|kit|acessórios|brindes?)\b/gi, '');
    
    // Remove códigos de produto (SKU, modelos genéricos)
    cleaned = cleaned.replace(/\b[A-Z]{2,}-?\d{2,}\b/g, '');
    cleaned = cleaned.replace(/\bref\.?\s*\d+\b/gi, '');
    cleaned = cleaned.replace(/\bcód\.?\s*\d+\b/gi, '');
    
    // Remove medidas genéricas
    cleaned = cleaned.replace(/\b\d+\s*(cm|mm|m|polegadas?|pol|")\b/gi, '');
    
    // Remove caracteres especiais extras
    cleaned = cleaned.replace(/[_\-–—]+/g, ' ');
    cleaned = cleaned.replace(/\s*[|/\\]\s*/g, ' ');
    
    // Remove espaços múltiplos
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Limita a 8 palavras mais relevantes
    const words = cleaned.split(' ').filter(w => w.length > 2);
    cleaned = words.slice(0, 8).join(' ');
    
    console.log(`🧹 Limpeza: "${title}" → "${cleaned}"`);
    return cleaned;
}

// 🚫 DETECTA PROMOÇÕES E DESCONTOS SUSPEITOS
function isPromotionalPrice(comparison, currentPrice) {
    const { productNameFound, price, store } = comparison;
    
    // Detecta "Leve X Pague Y"
    const leveXPagueY = /leve\s*\d+\s*pague\s*\d+/gi;
    if (leveXPagueY.test(productNameFound)) {
        console.log(`🚫 Rejeitado (Leve X Pague Y): ${store} - ${productNameFound}`);
        return true;
    }
    
    // Detecta "X por R$" (ex: "3 por R$ 99")
    const multiBuy = /\d+\s*por\s*r?\$?\s*\d+/gi;
    if (multiBuy.test(productNameFound)) {
        console.log(`🚫 Rejeitado (Multi-compra): ${store} - ${productNameFound}`);
        return true;
    }
    
    // Detecta "kit com X unidades"
    const kitPattern = /kit\s+(com|de)?\s*\d+\s*(unidades?|peças?|itens?)/gi;
    if (kitPattern.test(productNameFound)) {
        console.log(`🚫 Rejeitado (Kit): ${store} - ${productNameFound}`);
        return true;
    }
    
    // Detecta "combo" no nome do produto
    if (/combo|pacote|kit\s+completo/gi.test(productNameFound)) {
        console.log(`🚫 Rejeitado (Combo): ${store} - ${productNameFound}`);
        return true;
    }
    
    // Preços anormalmente baixos (possível erro ou promoção falsa)
    if (price < 5) {
        console.log(`🚫 Rejeitado (Preço muito baixo): ${store} - R$ ${price}`);
        return true;
    }
    
    // 🔥 NOVO: Rejeita preços genéricos/placeholders comuns
    const genericPrices = [99.99, 199.99, 299.99, 399.99, 499.99, 599.99, 699.99, 799.99, 899.99, 999.99, 9999.99];
    if (genericPrices.includes(price)) {
        console.log(`🚫 Rejeitado (Preço genérico placeholder): ${store} - R$ ${price}`);
        return true;
    }
    
    // 🔥 NOVO: Rejeita preços muito maiores que o lance atual (mais de 50x)
    if (currentPrice > 0 && price > currentPrice * 50) {
        console.log(`🚫 Rejeitado (Preço irrealisticamente alto): ${store} - R$ ${price} vs Lance R$ ${currentPrice}`);
        return true;
    }
    
    // 🔥 NOVO: Rejeita se o preço termina em .99 E é maior que 10x o lance
    if (currentPrice > 0 && price > currentPrice * 10 && price.toString().endsWith('.99')) {
        console.log(`🚫 Rejeitado (Preço suspeito .99): ${store} - R$ ${price}`);
        return true;
    }
    
    return false;
}

// 🌐 EXTRAÇÃO VIA HEADLESS BROWSER (opcional, para sites dinâmicos)
async function fetchWithBrowser(url) {
    try {
        const browserbaseApiKey = Deno.env.get('BROWSERBASE_API_KEY');
        if (!browserbaseApiKey) {
            console.log('⚠️ BROWSERBASE_API_KEY não configurada, pulando headless browser');
            return null;
        }
        
        const bb = new Browserbase({ apiKey: browserbaseApiKey });
        const session = await bb.createSession();
        
        const response = await fetch(`https://www.browserbase.com/v1/sessions/${session.id}/navigate`, {
            method: 'POST',
            headers: {
                'x-bb-api-key': browserbaseApiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        if (!response.ok) {
            console.log('❌ Erro ao navegar com browser:', response.status);
            return null;
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000)); // Aguarda JS carregar
        
        const contentResponse = await fetch(`https://www.browserbase.com/v1/sessions/${session.id}/content`, {
            headers: { 'x-bb-api-key': browserbaseApiKey }
        });
        
        const content = await contentResponse.text();
        await bb.deleteSession(session.id);
        
        console.log('✅ Conteúdo extraído via headless browser');
        return content;
    } catch (error) {
        console.error('❌ Erro no headless browser:', error.message);
        return null;
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const body = await req.json();
        const { auctionId, forceRefresh = false, forceGoogleShopping = false } = body;

        if (!auctionId) {
            return Response.json({ error: "auctionId é obrigatório" }, { status: 400 });
        }

        const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
        
        if (!auctions || auctions.length === 0) {
            return Response.json({ error: "Leilão não encontrado" }, { status: 404 });
        }
        
        const auction = auctions[0];
        
        // Verifica cache (se não forçar refresh)
        if (!forceRefresh && auction.market_price && auction.last_comparison_date) {
            const cacheAge = Date.now() - new Date(auction.last_comparison_date).getTime();
            const cacheLimit = 24 * 60 * 60 * 1000; // 24 horas
            
            if (cacheAge < cacheLimit) {
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
                        savingsPercent: parseFloat(savingsPercent.toFixed(0)),
                        isFactoryDirect: auction.comparai_mode === 'supplier',
                        totalStoresAnalyzed: 5,
                        comparisons: []
                    },
                    cached: true,
                    cacheAge: Math.floor(cacheAge / 1000 / 60)
                });
            }
        }

        // Limpa título para busca
        const cleanTitle = advancedTitleCleanup(auction.title);
        const currentPrice = auction.current_price || auction.starting_price;
        const category = auction.category || 'outros';

        const MAX_PRICES = {
            'eletronicos': 15000,
            'eletrodomesticos': 10000,
            'moveis_decoracao': 8000,
            'casa_jardim': 5000,
            'ferramentas': 5000,
            'default': 5000
        };
        const maxPrice = MAX_PRICES[category] || MAX_PRICES.default;

        // Busca no Google Shopping com IA
        const searchPrompt = `Busque no Google Shopping Brasil o produto: ${cleanTitle}

REGRAS IMPORTANTES:
- APENAS produtos NOVOS de lojas confiáveis (Mercado Livre, Magazine Luiza, Amazon, Americanas, Shopee, Casas Bahia, Carrefour)
- IGNORE produtos usados, recondicionados ou "open box"
- IGNORE promoções "Leve X Pague Y" ou "X por R$"
- IGNORE kits com múltiplas unidades
- Preços entre R$ 10 e R$ ${maxPrice.toFixed(2)}
- PREÇO ATUAL DO LEILÃO: R$ ${currentPrice.toFixed(2)} (use como referência de mercado)
- ⚠️ CRÍTICO: NÃO invente preços genéricos como R$ 999,99 - busque PREÇOS REAIS
- ⚠️ CRÍTICO: Se não encontrar, retorne array vazio [] - NÃO invente dados
- Retorne 3-6 comparações REAIS e VERIFICADAS

RETORNE JSON:
{
  "comparisons": [
    {"store": "Nome da Loja", "productNameFound": "Nome Exato do Produto", "price": 129.90, "url": "https://..."}
  ]
}`;

        let llmResult;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            attempts++;
            
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
                        }
                    }
                });

                const validComparisons = (llmResult?.comparisons || [])
                    .filter(c => c.price && c.price >= 10 && c.price <= maxPrice)
                    .filter(c => !isPromotionalPrice(c, currentPrice));

                if (validComparisons.length > 0) {
                    llmResult.comparisons = validComparisons;
                    break;
                }

                if (attempts < maxAttempts) {
                    console.log(`⏳ Tentativa ${attempts} sem resultados válidos, tentando novamente...`);
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }

            } catch (error) {
                console.error(`❌ Erro na tentativa ${attempts}:`, error.message);
                if (attempts === maxAttempts) throw error;
            }
        }

        const comparisons = llmResult?.comparisons || [];
        
        if (comparisons.length === 0) {
            return Response.json({
                success: false,
                error: "Não encontramos preços para comparar no momento.",
                errorCode: "NO_COMPARISONS"
            }, { status: 404 });
        }

        const prices = comparisons.map(c => c.price);
        const minPrice = Math.min(...prices);
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const savings = minPrice - currentPrice;
        const savingsPercent = minPrice > 0 ? (savings / minPrice) * 100 : 0;

        // 🔥 VALIDAÇÃO FINAL: Se economia maior que 95%, provavelmente dados ruins
        if (savingsPercent > 95 || savingsPercent < -500) {
            console.log(`❌ ECONOMIA IRREALISTA: ${savingsPercent}% - Rejeitando resultado`);
            return Response.json({
                success: false,
                error: "Comparação retornou dados inconsistentes. Tente novamente.",
                errorCode: "UNREALISTIC_SAVINGS"
            }, { status: 422 });
        }

        // Atualiza cache no banco
        await base44.asServiceRole.entities.Auction.update(auctionId, {
            market_price: minPrice,
            last_comparison_date: new Date().toISOString()
        });

        console.log(`📊 Resultado: ${comparisons.length} lojas | Menor: R$ ${minPrice.toFixed(2)} | Economia: R$ ${savings.toFixed(2)}`);

        return Response.json({
            success: true,
            comparison: {
                productName: auction.title,
                ourPrice: currentPrice,
                comparisons: comparisons,
                cheapestMarketPrice: minPrice,
                averageMarketPrice: avgPrice,
                savings: savings,
                savingsPercent: parseFloat(savingsPercent.toFixed(0)),
                isFactoryDirect: false,
                totalStoresAnalyzed: comparisons.length,
                searchAttempts: attempts,
                priceLabel: 'Menor Preço do Mercado'
            },
            cached: false
        });

    } catch (error) {
        console.error('❌ Erro geral:', error);
        return Response.json({
            success: false,
            error: "Erro ao comparar preços",
            details: error.message
        }, { status: 500 });
    }
});