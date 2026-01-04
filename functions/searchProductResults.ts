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
            prompt: `🔍 BUSQUE "${productName}" NO GOOGLE SHOPPING / MERCADO LIVRE

        🎯 OBJETIVO: Encontrar 6-8 anúncios REAIS de sites BRASILEIROS

        📋 PARA CADA ANÚNCIO:
        1. title: Título completo
        2. price: Preço numérico (ex: 2999.90)
        3. marketplace: "Mercado Livre", "Amazon", "Shopee", "Magazine Luiza", etc
        4. productUrl: URL COMPLETA começando com https://
        5. condition: "Novo", "Usado", ou "Recondicionado"
        6. thumbnailUrl: URL DIRETA da imagem do produto (formato: https://...jpg ou .webp ou .png)
        7. rating: Avaliação 0-5
        8. seller: Nome da loja

        🖼️ THUMBNAILS - SUPER IMPORTANTE:
        - DEVE ser URL DIRETA da imagem (não página HTML)
        - Formatos válidos: .jpg, .jpeg, .png, .webp
        - MERCADO LIVRE: Use URLs tipo https://http2.mlstatic.com/D_NQ_NP_...jpg
        - AMAZON: Use URLs tipo https://m.media-amazon.com/images/I/...jpg
        - SHOPEE: Use URLs tipo https://cf.shopee.com.br/file/...
        - NÃO retorne URLs de páginas ou SVGs

        ⚠️ REGRAS:
        ✅ VARIE marketplaces, preços e vendedores
        ✅ URLs devem ser REAIS (não invente)
        ✅ Cada anúncio deve ser DIFERENTE
        ❌ NÃO repita o mesmo produto
        ❌ NÃO use URLs inválidas/quebradas

        🔍 PRIORIZE:
        1. Mercado Livre Brasil
        2. Amazon Brasil
        3. Shopee Brasil
        4. Magazine Luiza`,
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