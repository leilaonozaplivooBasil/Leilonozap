import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// 🔥 FUNÇÃO CRÍTICA: Remove "Leilão NoZap" GARANTIDO
function simplifyProductTitle(title) {
    if (!title) return title;
    
    let simplified = title;
    
    simplified = simplified.replace(/leil[aã]o\s*no\s*zap\s*-?\s*/gi, '');
    simplified = simplified.replace(/leil[aã]o\s*nozap\s*-?\s*/gi, '');
    simplified = simplified.replace(/nozap\s*-?\s*/gi, '');
    simplified = simplified.replace(/^[-\s]+/, '');
    simplified = simplified.replace(/\s*marca\s+\w+\s*/gi, ' ');
    simplified = simplified.replace(/\s*categoria\s+[\w\s]+$/gi, '');
    simplified = simplified.replace(/\b(110v|220v|bivolt|127v|240v)\b/gi, '');
    simplified = simplified.replace(/\s+(vermelho|preto|branco|azul|verde|amarelo)$/gi, '');
    simplified = simplified.replace(/\s+com\s+(maleta|acessórios|kit)\b/gi, '');
    simplified = simplified.replace(/\b(cm|mm|cm-\d+)\b/gi, '');
    simplified = simplified.replace(/\b[A-Z]{2,}-?\d{2,}\b/g, '');
    simplified = simplified.replace(/[-_]+/g, ' ');
    simplified = simplified.replace(/\s+/g, ' ');
    simplified = simplified.trim();
    
    if (simplified.length > 60) {
        const words = simplified.split(' ');
        simplified = words.slice(0, 6).join(' ');
    }
    
    console.log(`🧹 LIMPEZA: "${title}" → "${simplified}"`);
    return simplified;
}

const CATEGORY_MAX_PRICES = {
    'eletronicos': 15000,
    'eletrodomesticos': 10000,
    'moveis_decoracao': 8000,
    'casa_jardim': 5000,
    'ferramentas': 5000,
    'roupas_acessorios': 2000,
    'esportes_lazer': 5000,
    'brinquedos_hobbies': 3000,
    'livros_midia': 1000,
    'veiculos_pecas': 20000,
    'instrumentos_musicais': 10000,
    'beleza_cuidado_pessoal': 1000,
    'outros': 5000
};

export async function searchGoogleShopping({ base44, productTitle, validCurrentPrice, category }) {
    console.log(`\n🔥 ═══ BUSCA NO GOOGLE SHOPPING ═══`);
        
    let cleanTitle = simplifyProductTitle(productTitle);
    
    if (/leil[aã]o|nozap/gi.test(cleanTitle)) {
        cleanTitle = cleanTitle.replace(/leil[aã]o|nozap/gi, '').replace(/\s+/g, ' ').trim();
    }

    console.log(`📝 TERMO INICIAL: "${cleanTitle}"`);

    let llmResult = null;
    let attempts = 0;
    const maxAttempts = 3;
    let finalSearchTermUsed = cleanTitle;
    const maxAllowedPrice = CATEGORY_MAX_PRICES[category] || 5000;

    while (attempts < maxAttempts && (!llmResult?.comparisons || llmResult.comparisons.length === 0)) {
        attempts++;
        
        let searchTerm = cleanTitle;

        if (attempts === 2) {
            const words = cleanTitle.split(' ').filter(w => w.length > 2);
            searchTerm = words.slice(0, Math.min(4, words.length)).join(' ');
        } else if (attempts === 3) {
            const words = cleanTitle.split(' ').filter(w => w.length > 3);
            searchTerm = words.slice(0, Math.min(3, words.length)).join(' ');
        }
        
        if (!searchTerm || searchTerm.length < 5) {
            const originalWords = productTitle.split(' ').filter(w => w.length > 2);
            searchTerm = originalWords.slice(0, Math.min(3, originalWords.length)).join(' ');
        }

        finalSearchTermUsed = searchTerm;
        console.log(`⚠️ Tentativa ${attempts}: "${searchTerm}"`);

        const searchPrompt = `Você é um assistente de pesquisa de preços no Google Shopping Brasil.

PRODUTO: ${searchTerm}

INSTRUÇÕES:
- Busque no Google Shopping Brasil
- PRIORIZE produtos NOVOS de lojas oficiais (Mercado Livre, Magazine Luiza, Amazon, Americanas, Shopee, Casas Bahia, Carrefour, etc)
- IGNORE produtos usados ou recondicionados
- Preços entre R$ 10,00 e R$ ${maxAllowedPrice.toFixed(2)}
- Forneça 3-7 comparações válidas

RETORNE JSON:
{
  "comparisons": [
    {"store": "Nome da Loja", "productNameFound": "Nome do Produto", "price": 999.99, "url": "https://..."}
  ]
}`;

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

            const validComparisonsInAttempt = (llmResult?.comparisons || []).filter(c => 
                c.price && c.price >= 10 && c.price <= maxAllowedPrice && c.store && c.store.length > 2
            );

            console.log(`   Resultado: ${validComparisonsInAttempt.length} lojas válidas`);
            
            if (validComparisonsInAttempt.length > 0) {
                llmResult.comparisons = validComparisonsInAttempt;
                break;
            }
            
            if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
        } catch (error) {
            console.error(`❌ Erro Tentativa ${attempts}:`, error.message);
            if (attempts === maxAttempts) throw error;
        }
    }

    if (!llmResult || !llmResult.comparisons || llmResult.comparisons.length === 0) {
        return {
            success: false,
            error: "Não encontramos preços para comparar no momento.",
            errorCode: "NO_COMPARISONS",
            searchTerm: finalSearchTermUsed
        };
    }

    const validComparisons = llmResult.comparisons;
    const allPrices = validComparisons.map(c => c.price);
    const avgPrice = allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length;
    const minPrice = Math.min(...allPrices);

    const savings = minPrice - validCurrentPrice;
    const savingsPercent = minPrice > 0 ? (savings / minPrice) * 100 : 0;
    const isExpensive = validCurrentPrice > minPrice;

    console.log(`📊 RESULTADO: Mínimo R$ ${minPrice.toFixed(2)} | Economia R$ ${savings.toFixed(2)}`);

    return {
        success: true,
        comparison: {
            productName: productTitle,
            ourPrice: validCurrentPrice,
            comparisons: validComparisons,
            cheapestMarketPrice: minPrice,
            lowestPrice: minPrice,
            savings: savings,
            savingsPercent: parseFloat(savingsPercent.toFixed(0)),
            isFactoryDirect: false,
            priceCalculationMethod: 'minimum',
            totalStoresAnalyzed: validComparisons.length,
            isExpensive: isExpensive,
            searchTermUsed: finalSearchTermUsed,
            searchAttempts: attempts,
            isGoogleShopping: true,
            priceLabel: 'Menor Preço do Mercado'
        }
    };
}