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

        console.log(`🔍 Buscando: ${productName}`);

        // Busca completa em uma chamada só
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Busque o produto "${productName}" e extraia tudo.

🎯 IMPORTANTE:
- Produto PRINCIPAL (não acessórios como capa, carregador, cabo, película)
- Busque em Mercado Livre, Amazon ou Shopee
- Extraia título, descrição E imagens de produto

OBRIGATÓRIO retornar:
{
  "found": true,
  "title": "Nome completo do produto",
  "description": "Descrição com specs",
  "imageUrls": ["url1", "url2", ...]  // URLs COMPLETAS de imagens
}

Se só encontrar acessórios ou páginas de busca: found = false`,
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
                    }
                },
                required: ["found"]
            }
        });

        console.log(`📦 Resultado: found=${result.found}, title="${result.title}", ${result.imageUrls?.length || 0} imgs`);

        if (!result.found || !result.title) {
            return Response.json({
                error: "Produto não encontrado",
                suggestion: "Tente com marca + modelo (ex: Samsung Galaxy S23)"
            }, { status: 404 });
        }

        // Valida acessórios no título
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

        const imageUrls = (result.imageUrls || [])
            .filter(url => url && typeof url === 'string' && url.startsWith('http') && !url.includes('...'))
            .slice(0, 6);

        if (imageUrls.length === 0) {
            return Response.json({
                error: "Produto encontrado mas sem imagens válidas",
                suggestion: "Use o importador por URL com link direto do produto",
                title: result.title,
                description: result.description
            }, { status: 404 });
        }

        console.log(`✅ ${result.title}: ${imageUrls.length} imagens`);

        return Response.json({
            found: true,
            title: result.title,
            description: result.description || 'Produto encontrado',
            imageUrls: imageUrls,
            source: 'Internet'
        }, { status: 200 });

    } catch (error) {
        console.error('❌ ERRO:', error.message);
        return Response.json({
            error: "Erro ao buscar produto",
            details: error.message
        }, { status: 500 });
    }
});