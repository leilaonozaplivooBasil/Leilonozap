import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productName } = await req.json();
        if (!productName) {
            return Response.json({ error: "Nome do produto obrigatório" }, { status: 400 });
        }

        console.log(`🔍 Buscando: ${productName}`);

        // USA IA COM BUSCA NA INTERNET
        const searchResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Busque na internet informações sobre o produto: "${productName}"

Encontre:
1. Nome completo e correto do produto
2. Descrição detalhada (2-3 linhas com características principais)
3. URLs de imagens reais do produto (mínimo 3, máximo 10)

IMPORTANTE: 
- Imagens devem ser URLs diretas (.jpg, .png, .webp)
- Priorize imagens de marketplaces conhecidos (Amazon, Mercado Livre, Magalu, etc)
- Evite logos ou ícones
- Retorne apenas dados reais encontrados na internet

Se não encontrar o produto, retorne title="Produto não encontrado" e description vazia.`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    imageUrls: {
                        type: "array",
                        items: { type: "string" }
                    },
                    marketplace: { type: "string" }
                },
                required: ["title", "description"]
            }
        });

        let { title, description, imageUrls, marketplace } = searchResult;

        // VALIDA E LIMPA IMAGENS
        imageUrls = (imageUrls || [])
            .filter(url => url && typeof url === 'string' && url.startsWith('http'))
            .filter(url => {
                const lower = url.toLowerCase();
                return (lower.endsWith('.jpg') || 
                        lower.endsWith('.jpeg') || 
                        lower.endsWith('.png') || 
                        lower.endsWith('.webp') ||
                        lower.includes('.jpg') ||
                        lower.includes('.png') ||
                        lower.includes('.webp')) &&
                       !lower.includes('logo') &&
                       !lower.includes('icon') &&
                       url.length > 40;
            })
            .slice(0, 10);

        console.log(`✅ ${title} - ${imageUrls.length} imagens`);

        if (!title || title.toLowerCase().includes('não encontrado')) {
            return Response.json({
                error: "Produto não encontrado",
                suggestion: "Tente com um nome mais específico ou marca"
            }, { status: 404 });
        }

        return Response.json({
            title: title.substring(0, 200),
            description: (description || 'Produto encontrado na internet').substring(0, 500),
            imageUrls: imageUrls,
            marketplace: marketplace || 'internet',
            searchTerm: productName
        });

    } catch (error) {
        console.error('❌', error);
        return Response.json({
            error: "Erro ao buscar produto",
            details: error.message
        }, { status: 500 });
    }
});