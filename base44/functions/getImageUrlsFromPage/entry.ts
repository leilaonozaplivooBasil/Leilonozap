import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ error: "productUrl é obrigatório" }, { status: 400 });
        }
        
        console.log('🤖 Usando IA para extrair imagens de:', productUrl);
        
        // 🆕 PROMPT OTIMIZADO - PEDE MÚLTIPLOS ÂNGULOS
        const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Acesse: ${productUrl}

Extraia URLs de TODAS as imagens do produto (diferentes ângulos, cores, detalhes).

IMPORTANTE:
1. Busque imagens em ALTA RESOLUÇÃO (-F.jpg, -O.jpg, -F.webp, _large.jpg)
2. Se encontrar galeria/carousel, pegue TODAS as fotos
3. Retorne NO MÍNIMO 8 URLs DIFERENTES
4. Inclua diferentes ângulos: frente, verso, lateral, detalhe
5. Se houver variantes de cor, inclua todas

❌ NÃO DUPLIQUE URLs
❌ NÃO use miniaturas (-I.jpg, _thumb)

Exemplos de domínios válidos:
- http2.mlstatic.com/D_NQ_NP_2X_...
- images-amazon.com/images/I/...
- a-static.mlcdn.com.br/...

Retorne o MÁXIMO de URLs diferentes que encontrar!`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    image_urls: {
                        type: "array",
                        items: { type: "string" },
                        minItems: 8,
                        description: "8+ URLs ÚNICAS de imagens em alta resolução"
                    }
                },
                required: ["image_urls"]
            }
        });
        
        console.log('📦 Resposta da IA:', aiResponse);
        
        const imageUrls = aiResponse?.image_urls || [];
        
        // REMOÇÃO AGRESSIVA DE DUPLICATAS
        const seenUrls = new Set();
        const validUrls = imageUrls
            .filter(url => url && typeof url === 'string' && url.startsWith('http'))
            .map(url => {
                // Normaliza: remove query params, trailing slash, espaços
                return url.split('?')[0].split('#')[0].trim().replace(/\/+$/, '');
            })
            .filter(url => {
                if (url.length < 20) return false;
                // Remove duplicatas EXATAS
                const baseUrl = url.toLowerCase();
                if (seenUrls.has(baseUrl)) return false;
                seenUrls.add(baseUrl);
                return true;
            })
            .slice(0, 10);
        
        console.log(`✅ ${validUrls.length} URLs extraídas pela IA`);
        
        return Response.json({ imageUrls: validUrls });
        
    } catch (error) {
        console.error('❌ Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});