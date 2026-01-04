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
            prompt: `BUSQUE NO GOOGLE SHOPPING: "${productName}"

        🎯 OBJETIVO: Encontrar 6-8 anúncios REAIS e DIFERENTES do produto

        📋 PARA CADA ANÚNCIO ENCONTRADO:
        1. title: Título exato do anúncio
        2. price: Preço em número (extraia apenas números, ex: 2999.90)
        3. marketplace: Site (Mercado Livre, Amazon, Shopee, Magazine Luiza, etc)
        4. productUrl: URL COMPLETA e REAL do anúncio (começando com https://)
        5. condition: Estado ("Novo", "Usado", ou "Recondicionado")
        6. thumbnailUrl: URL da imagem do produto
        7. rating: Nota 0-5 se houver avaliações
        8. seller: Nome do vendedor/loja

        ⚠️ REGRAS CRÍTICAS:
        - URLs devem ser REAIS e ACESSÍVEIS (teste antes de retornar)
        - VARIE os marketplaces (Mercado Livre, Amazon, Shopee, etc)
        - VARIE os preços (do mais barato ao mais caro)
        - VARIE os vendedores
        - NÃO retorne o mesmo anúncio repetido
        - NÃO invente URLs, use apenas anúncios que você REALMENTE ENCONTROU

        🔍 BUSQUE EM:
        - Google Shopping
        - Mercado Livre Brasil
        - Amazon Brasil
        - Shopee Brasil
        - Magazine Luiza
        - Casas Bahia

        ✅ RETORNE APENAS ANÚNCIOS COM:
        - URL válida e acessível
        - Foto do produto
        - Preço visível
        - Marketplace confiável`,
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