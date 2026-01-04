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
        
        // Log de início
        await base44.asServiceRole.entities.SystemLog.create({
          step: 'PRODUCT_SEARCH_BY_NAME_INITIATED',
          status: 'info',
          message: 'Busca de produto por nome iniciada',
          component_name: 'searchProductByName',
          payload: { productName }
        }).catch(() => {});

        // Busca completa em uma chamada só
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Busque "${productName}" na internet e EXTRAIA O MÁXIMO DE IMAGENS POSSÍVEL.

🎯 PRIORIDADE MÁXIMA: ENCONTRAR PELO MENOS 8-12 IMAGENS DIFERENTES

Busque em MÚLTIPLOS sites:
- Mercado Livre (várias páginas de produtos)
- Amazon Brasil (várias listagens)
- Magazine Luiza
- Shopee
- Google Shopping

Para cada site, extraia:
- Imagem principal do produto
- Imagens de galeria/carrossel
- Imagens de variações (cores, ângulos)
- Miniaturas em alta resolução

OBRIGATÓRIO retornar:
{
  "found": true,
  "title": "Nome exato do produto",
  "description": "Descrição completa com especificações",
  "imageUrls": ["url1", "url2", "url3", ...]  // MÍNIMO 8 URLs, MÁXIMO 15
}

❌ REJEITE acessórios (capa, carregador, cabo, película)
❌ Se encontrar < 5 imagens, retorne found = false`,
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
            // Log de produto não encontrado
            await base44.asServiceRole.entities.SystemLog.create({
              step: 'PRODUCT_SEARCH_BY_NAME_NOT_FOUND',
              status: 'warning',
              message: 'Produto não encontrado na busca',
              component_name: 'searchProductByName',
              payload: { productName }
            }).catch(() => {});
            
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
            .slice(0, 12);

        if (imageUrls.length === 0) {
            return Response.json({
                error: "Produto encontrado mas sem imagens válidas",
                suggestion: "Use o importador por URL com link direto do produto",
                title: result.title,
                description: result.description
            }, { status: 404 });
        }

        console.log(`✅ ${result.title}: ${imageUrls.length} imagens encontradas`);

        // Log de sucesso
        await base44.asServiceRole.entities.SystemLog.create({
          step: 'PRODUCT_SEARCH_BY_NAME_SUCCESS',
          status: 'success',
          message: `Produto encontrado: ${result.title}`,
          component_name: 'searchProductByName',
          payload: { 
            productName,
            title: result.title,
            imageCount: imageUrls.length
          }
        }).catch(() => {});

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