import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function validateImageUrl(url) {
    try {
        const response = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) return false;
        
        const contentType = response.headers.get('content-type');
        return contentType && contentType.startsWith('image/');
    } catch {
        return false;
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productName } = await req.json();
        if (!productName) {
            return Response.json({ error: "Nome do produto obrigatório" }, { status: 400 });
        }

        console.log(`🔍 ETAPA 1: Buscar URL do produto`);

        // Busca URL da página do produto
        const searchResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Busque "${productName}" na internet.

Encontre a URL de UM produto individual (não lista/busca).

VÁLIDO:
✅ produto.mercadolivre.com.br/MLB-...
✅ amazon.com.br/dp/...
✅ shopee.com.br/produto-...

INVÁLIDO:
❌ lista.mercadolivre
❌ /s?k=
❌ /search
❌ acessórios (capa, carregador, cabo)

Retorne apenas a URL ou null.`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    productUrl: { type: ["string", "null"] }
                },
                required: ["productUrl"]
            }
        });

        const productUrl = searchResult?.productUrl;
        
        if (!productUrl || typeof productUrl !== 'string' || !productUrl.startsWith('http')) {
            return Response.json({
                error: "Produto não encontrado",
                suggestion: "Tente com marca + modelo completo"
            }, { status: 404 });
        }

        console.log(`✅ URL encontrada: ${productUrl}`);
        console.log(`🔍 ETAPA 2: Extrair dados da página`);

        // Usa extractDataFromUrl que já funciona perfeitamente
        const extractResult = await base44.functions.invoke('extractDataFromUrl', {
            productUrl: productUrl
        });

        if (!extractResult || extractResult.status !== 200) {
            return Response.json({
                error: "Erro ao extrair dados do produto",
                suggestion: "Tente usar o importador por URL"
            }, { status: 500 });
        }

        const data = extractResult.data;

        if (!data.title || !data.imageUrls || data.imageUrls.length === 0) {
            return Response.json({
                error: "Produto encontrado mas sem imagens",
                suggestion: "Use o importador por URL ou upload manual",
                title: data.title,
                description: data.description
            }, { status: 404 });
        }

        // Valida acessórios
        const lower = data.title.toLowerCase();
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

        console.log(`✅ SUCESSO: ${data.title} com ${data.imageUrls.length} imagens`);

        return Response.json({
            found: true,
            title: data.title,
            description: data.description || 'Produto encontrado',
            imageUrls: data.imageUrls.slice(0, 6),
            source: data.marketplace || 'Internet'
        }, { status: 200 });

    } catch (error) {
        console.error('❌ ERRO:', error.message);
        return Response.json({
            error: "Erro ao buscar produto",
            details: error.message
        }, { status: 500 });
    }
});