import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ error: "productUrl é obrigatório" }, { status: 400 });
        }
        
        console.log('🤖 Usando IA para extrair imagens de:', productUrl);
        
        // 🆕 USA IA COM ACESSO À INTERNET - PROMPT MELHORADO
        const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Acesse esta página de produto: ${productUrl}

Encontre e retorne URLs de imagens DO PRODUTO que estejam no HTML da página.

REGRAS CRÍTICAS:
✅ URLs devem começar com: http2.mlstatic.com, images-amazon, ou similar
✅ APENAS versões GRANDES: terminam com -F.jpg, -O.jpg, -F.webp, _large.jpg
✅ Retorne NO MÍNIMO 6 URLs DIFERENTES (não duplicadas!)
✅ Fotos principais do produto, não miniaturas, não logos

❌ NÃO retorne URLs duplicadas
❌ NÃO use miniaturas: -I.jpg, _thumb, _small
❌ NÃO use imagens de UI ou propaganda

Exemplo correto: https://http2.mlstatic.com/D_NQ_NP_2X_123456-MLB78901234_052024-F.webp

IMPORTANTE: Cada URL deve ser DIFERENTE das outras!`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    image_urls: {
                        type: "array",
                        items: { type: "string" },
                        minItems: 6,
                        description: "Array com 6+ URLs DIFERENTES de imagens grandes"
                    }
                },
                required: ["image_urls"]
            }
        });
        
        console.log('📦 Resposta da IA:', aiResponse);
        
        const imageUrls = aiResponse?.image_urls || [];
        
        // Remove duplicatas usando Set e valida URLs
        const uniqueUrls = [...new Set(imageUrls)];
        
        const validUrls = uniqueUrls
            .filter(url => url && typeof url === 'string' && url.startsWith('http'))
            .map(url => url.split('?')[0].trim()) // Remove query params
            .filter((url, index, arr) => arr.indexOf(url) === index) // Remove duplicatas novamente
            .slice(0, 10); // Pega até 10 imagens diferentes
        
        console.log(`✅ ${validUrls.length} URLs extraídas pela IA`);
        
        return Response.json({ imageUrls: validUrls });
        
    } catch (error) {
        console.error('❌ Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});