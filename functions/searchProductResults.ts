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
            prompt: `🔍 BUSCA REAL NO GOOGLE SHOPPING: "${productName}"

        ⚠️ ATENÇÃO: Você DEVE usar seu acesso à internet via add_context_from_internet=true para buscar produtos REAIS.

        📌 INSTRUÇÕES CRÍTICAS:
        1. Acesse Google Shopping ou Google Search
        2. Busque por "${productName}" + "mercado livre brasil" ou "amazon brasil"
        3. COPIE as URLs REAIS dos anúncios que você ENCONTROU
        4. NÃO invente URLs
        5. NÃO retorne URLs que você não VERIFICOU que existem

        📋 PARA CADA ANÚNCIO REAL ENCONTRADO:
        - title: Título exato que você VIU no anúncio
        - price: Preço que você VIU (número)
        - marketplace: Site onde encontrou (Mercado Livre, Amazon, Shopee, Magazine Luiza)
        - productUrl: URL EXATA que você COPIOU do Google (começando com https://produto.mercadolivre.com.br/ ou https://www.amazon.com.br/ ou similar)
        - condition: "Novo", "Usado", ou "Recondicionado" (se identificável)
        - thumbnailUrl: URL da imagem que você VIU (formato https://http2.mlstatic.com/... para ML ou https://m.media-amazon.com/... para Amazon)
        - rating: Avaliação se houver
        - seller: Nome do vendedor se identificável

        🎯 EXEMPLOS DE URLs VÁLIDAS:
        ✅ https://produto.mercadolivre.com.br/MLB-XXXXXXXXX-titulo-do-produto
        ✅ https://www.amazon.com.br/dp/XXXXXXXXX
        ✅ https://shopee.com.br/product/XXXXXXXXX
        ❌ https://mercadolivre.com.br/produto-xyz (URL genérica - ERRADO)
        ❌ https://loja.com/produto123 (URL inventada - ERRADO)

        ⚠️ SE VOCÊ NÃO CONSEGUIR ACESSAR A INTERNET:
        - Retorne array vazio: {"results": []}
        - NÃO invente dados

        🔍 RETORNE 5-8 ANÚNCIOS REAIS E DIFERENTES
        ✅ Varie marketplaces, preços e vendedores
        ✅ Use apenas URLs que você REALMENTE ENCONTROU`,
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

        console.log(`✅ ${result.results.length} anúncios retornados pela IA`);

        // 🔍 VALIDA E FILTRA DUPLICATAS
        const seen = new Set();
        const uniqueResults = result.results.filter(item => {
            // Remove duplicatas por URL
            if (seen.has(item.productUrl)) {
                console.log(`🚫 Duplicata removida: ${item.productUrl}`);
                return false;
            }
            seen.add(item.productUrl);

            // Valida campos obrigatórios
            if (!item.title || !item.marketplace || !item.productUrl) {
                console.log(`🚫 Anúncio inválido (campos faltando)`);
                return false;
            }

            // Valida formato de URL
            if (!item.productUrl.startsWith('http')) {
                console.log(`🚫 URL inválida: ${item.productUrl}`);
                return false;
            }

            return true;
        });

        console.log(`✅ ${uniqueResults.length} anúncios únicos e válidos`);

        if (uniqueResults.length === 0) {
            return Response.json({
                error: "Nenhum anúncio válido encontrado",
                results: []
            }, { status: 404 });
        }

        return Response.json({
            results: uniqueResults,
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