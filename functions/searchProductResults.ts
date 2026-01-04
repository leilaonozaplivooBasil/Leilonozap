import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// 🔍 BUSCA E RETORNA LISTA DE RESULTADOS (não extrai ainda)
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productName } = await req.json();
        if (!productName) {
            return Response.json({ error: "Nome do produto obrigatório" }, { status: 400 });
        }

        console.log(`🔍 Buscando resultados para: ${productName}`);

        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `BUSCA RIGOROSA: "${productName}"

RETORNE UMA LISTA com 5-8 anúncios DIFERENTES do produto:

Para cada anúncio, retorne:
1. title: Título do anúncio
2. price: Preço aproximado (número)
3. marketplace: Nome da loja (Mercado Livre, Amazon, etc)
4. productUrl: URL COMPLETA do anúncio
5. condition: "Novo", "Usado", ou "Recondicionado"
6. thumbnailUrl: URL de uma foto do anúncio
7. rating: Avaliação 0-5 (se houver)
8. seller: Nome do vendedor

REGRAS:
- PRIORIZE anúncios com FOTOS CLARAS
- EVITE acessórios isolados
- VARIE os marketplaces
- URLs devem ser REAIS e ACESSÍVEIS`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    results: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                price: { type: "number" },
                                marketplace: { type: "string" },
                                productUrl: { type: "string" },
                                condition: { type: "string" },
                                thumbnailUrl: { type: "string" },
                                rating: { type: "number" },
                                seller: { type: "string" }
                            },
                            required: ["title", "marketplace", "productUrl"]
                        },
                        minItems: 3
                    }
                },
                required: ["results"]
            }
        });

        console.log(`✅ ${result.results.length} anúncios encontrados`);

        return Response.json({
            results: result.results,
            searchTerm: productName
        });

    } catch (error) {
        console.error('❌', error);
        return Response.json({
            error: "Erro ao buscar",
            details: error.message
        }, { status: 500 });
    }
});