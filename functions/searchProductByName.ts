import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productName } = await req.json();
        if (!productName) {
            return Response.json({ error: "Nome do produto obrigatório" }, { status: 400 });
        }

        console.log(`🔍 BUSCA DIRETA: ${productName}`);

        // 🚀 IA BUSCA + EXTRAI TUDO DE UMA VEZ
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Busque o produto "${productName}" na internet e extraia TODOS os dados.

🎯 REGRAS:
1. Produto PRINCIPAL - NÃO acessórios (carregador, capa, película, cabo)
2. Encontre página oficial (Mercado Livre, Amazon, Shopee)
3. Extraia TODAS as URLs de imagens de PRODUTO (não logo, banner, ícone)
4. Máximo 8 imagens de melhor qualidade

RETORNE:
- found: true se achou produto válido
- title: Nome completo
- description: Descrição com especificações
- imageUrls: Array com URLs das imagens
- productUrl: URL da página

Se só encontrar acessórios ou nada: found = false`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    found: { type: "boolean" },
                    title: { type: "string" },
                    description: { type: "string" },
                    imageUrls: { 
                        type: "array",
                        items: { type: "string" }
                    },
                    productUrl: { type: "string" }
                },
                required: ["found"]
            }
        });

        console.log(`📦 IA retornou: found=${result.found}, title="${result.title}", ${result.imageUrls?.length || 0} imagens`);

        if (!result.found || !result.title) {
            return Response.json({
                error: "Produto não encontrado",
                suggestion: "Tente com marca + modelo (ex: Samsung Galaxy S23)"
            }, { status: 404 });
        }

        // Valida acessórios
        const lower = result.title.toLowerCase();
        const accessoryKeywords = [
            'carregador', 'charger', 'cabo', 'cable', 'capa', 'case',
            'película', 'protetor', 'glass', 'adaptador', 'adapter', 'fone'
        ];
        if (accessoryKeywords.some(k => lower.includes(k))) {
            return Response.json({
                error: "Sistema encontrou apenas acessórios",
                suggestion: "Seja mais específico no nome do produto"
            }, { status: 404 });
        }

        const imageUrls = result.imageUrls || [];
        
        if (imageUrls.length === 0) {
            return Response.json({
                error: "Produto encontrado mas sem imagens",
                suggestion: "Use o importador por URL ou upload manual",
                title: result.title,
                description: result.description
            }, { status: 404 });
        }

        console.log(`✅ SUCESSO: ${result.title} com ${imageUrls.length} imagens`);

        return Response.json({
            found: true,
            title: result.title,
            description: result.description || 'Produto encontrado',
            imageUrls: imageUrls.slice(0, 6),
            source: result.productUrl?.includes('mercadolivre') ? 'Mercado Livre' :
                    result.productUrl?.includes('amazon') ? 'Amazon' :
                    result.productUrl?.includes('shopee') ? 'Shopee' : 'Internet'
        }, { status: 200 });

    } catch (error) {
        console.error('❌ ERRO:', error.message);
        return Response.json({
            error: "Erro ao buscar produto",
            details: error.message
        }, { status: 500 });
    }
});