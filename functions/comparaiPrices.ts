import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const body = await req.json();
        const { auctionId } = body;

        if (!auctionId) {
            return Response.json({ error: "auctionId é obrigatório" }, { status: 400 });
        }

        const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
        
        if (!auctions || auctions.length === 0) {
            return Response.json({ error: "Leilão não encontrado" }, { status: 404 });
        }
        
        const auction = auctions[0];

        // Busca Google Shopping
        const searchPrompt = `Busque no Google Shopping Brasil o produto: ${auction.title}
        
Retorne JSON com comparações de preços:
{
  "comparisons": [
    {"store": "Loja", "price": 999.99, "url": "https://..."}
  ]
}`;

        const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
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
                                price: { type: "number" },
                                url: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        const comparisons = llmResult?.comparisons || [];
        const prices = comparisons.map(c => c.price).filter(p => p > 0);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const currentPrice = auction.current_price || auction.starting_price;
        const savings = minPrice - currentPrice;
        const savingsPercent = minPrice > 0 ? (savings / minPrice) * 100 : 0;

        return Response.json({
            success: true,
            comparison: {
                productName: auction.title,
                ourPrice: currentPrice,
                comparisons: comparisons,
                cheapestMarketPrice: minPrice,
                savings: savings,
                savingsPercent: parseFloat(savingsPercent.toFixed(0)),
                isFactoryDirect: false,
                totalStoresAnalyzed: comparisons.length
            },
            cached: false
        });

    } catch (error) {
        console.error('Erro:', error);
        return Response.json({
            success: false,
            error: "Erro ao comparar preços",
            details: error.message
        }, { status: 500 });
    }
});