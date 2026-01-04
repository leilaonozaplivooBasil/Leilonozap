import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ error: "productUrl é obrigatório" }, { status: 400 });
        }
        
        console.log('🤖 Usando IA para extrair imagens de:', productUrl);
        
        // 🆕 USA IA COM ACESSO À INTERNET - CONTORNA PROTEÇÕES ANTI-BOT
        const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Você é um extrator de URLs de imagens de produtos.

Acesse esta página: ${productUrl}

Extraia APENAS as URLs das IMAGENS DO PRODUTO (fotos principais que mostram o produto).

IGNORE:
- Logos, ícones, banners
- Imagens de UI/navegação
- Miniaturas pequenas
- Imagens de reviews/comentários

RETORNE as 6 melhores URLs de alta qualidade do produto.`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    image_urls: {
                        type: "array",
                        items: { type: "string" },
                        description: "URLs das imagens do produto em alta qualidade"
                    }
                },
                required: ["image_urls"]
            }
        });
        
        console.log('📦 Resposta da IA:', aiResponse);
        
        const imageUrls = aiResponse?.image_urls || [];
        
        // Valida e limpa URLs
        const validUrls = imageUrls
            .filter(url => url && typeof url === 'string' && url.startsWith('http'))
            .slice(0, 6);
        
        console.log(`✅ ${validUrls.length} URLs extraídas pela IA`);
        
        return Response.json({ imageUrls: validUrls });
        
    } catch (error) {
        console.error('❌ Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});