import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function getRandomUA() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ error: "URL obrigatória" }, { status: 400 });
        }

        console.log(`🔍 URL: ${productUrl}`);

        // IDENTIFICA MARKETPLACE
        const url = productUrl.toLowerCase();
        let marketplace = 'generico';
        if (url.includes('mercadolivre')) marketplace = 'mercadolivre';
        else if (url.includes('shopee')) marketplace = 'shopee';
        else if (url.includes('amazon')) marketplace = 'amazon';
        else if (url.includes('magalu') || url.includes('magazineluiza')) marketplace = 'magazineluiza';
        else if (url.includes('casasbahia')) marketplace = 'casasbahia';
        else if (url.includes('pontofrio')) marketplace = 'pontofrio';
        else if (url.includes('carrefour')) marketplace = 'carrefour';
        else if (url.includes('aliexpress')) marketplace = 'aliexpress';

        console.log(`🏪 ${marketplace}`);

        // 🔥 EXTRAÇÃO EM DUAS ETAPAS - DADOS + IMAGENS SEPARADAS
        console.log('🤖 ETAPA 1: Extraindo dados básicos...');
        
        const basicDataResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Acesse: ${productUrl}

Extraia:
1. title: Nome COMPLETO do produto
2. price: Preço À VISTA em REAIS como NUMBER
3. description: Descrição DETALHADA (mínimo 200 caracteres)`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    price: { type: "number" },
                    description: { type: "string" }
                },
                required: ["title", "description"]
            }
        });
        
        console.log('✅ ETAPA 1:', basicDataResult);
        
        console.log('🖼️ ETAPA 2: Extraindo URLs de imagens...');
        
        const imagesResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Acesse: ${productUrl}

MISSÃO: Encontre TODAS as URLs de imagens do produto em ALTA RESOLUÇÃO.

INSTRUÇÕES PARA MERCADO LIVRE:
1. Procure elementos <img> com class="ui-pdp-image" ou similar
2. Busque URLs que contenham: http2.mlstatic.com, mlstatic.com
3. Priorize URLs terminadas em: -F.jpg, -O.jpg, .jpg, .webp
4. IGNORE miniaturas (-I.jpg, -W.jpg, thumb)
5. Retorne NO MÍNIMO 4 URLs diferentes

Exemplo válido: https://http2.mlstatic.com/D_NQ_NP_2X_123456-MLB12345678-F.jpg`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    image_urls: { 
                        type: "array", 
                        items: { type: "string" },
                        minItems: 1
                    }
                },
                required: ["image_urls"]
            }
        });
        
        console.log('✅ ETAPA 2:', imagesResult);
        
        const extractionResult = {
            ...basicDataResult,
            image_urls: imagesResult.image_urls || []
        };

        let { title, description, price, image_urls } = extractionResult;
        
        console.log(`✅ IA retornou: ${image_urls?.length || 0} URLs de imagens`);
        
        // LIMPA URLs (remove duplicatas e URLs inválidas)
        const urlSet = new Set();
        const imageUrls = (image_urls || [])
            .filter(u => u && typeof u === 'string' && u.startsWith('http'))
            .map(u => u.split('?')[0].trim().replace(/\/+$/, ''))
            .filter(u => {
                if (u.length < 20 || urlSet.has(u)) return false;
                urlSet.add(u);
                return true;
            });

        console.log(`✅ ${imageUrls.length} URLs únicas prontas para download`);

        // Se não encontrou imagens, retorna sem imagens
        if (imageUrls.length === 0) {
            console.log('❌ Nenhuma imagem encontrada. Retornando sem imagens.');
            return Response.json({
                title: (title || 'Produto').substring(0, 200),
                description: (description || 'Produto importado').substring(0, 500),
                price: price || null,
                imageUrls: [],
                marketplace: marketplace,
                message: 'Produto encontrado, mas sem imagens. Use upload manual.'
            });
        }

        console.log(`✅ ${imageUrls.length} URLs originais encontradas`);
        console.log(`📤 [BACKEND] RETORNANDO URLs ORIGINAIS (SEM DOWNLOAD):`);
        console.log(`   title: ${title || 'Produto'}`);
        console.log(`   price: ${price || null}`);
        console.log(`   imageUrls (${imageUrls.length}):`, imageUrls);

        const finalResponse = {
            title: (title || 'Produto').substring(0, 200),
            description: (description || 'Produto importado').substring(0, 500),
            price: price || null,
            imageUrls: imageUrls, // URLs ORIGINAIS
            marketplace: marketplace
        };

        console.log(`🚀 [BACKEND] JSON FINAL:`, JSON.stringify(finalResponse));

        return Response.json(finalResponse);

    } catch (error) {
        console.error('❌', error);
        return Response.json({
            error: "Erro ao processar",
            details: error.message
        }, { status: 500 });
    }
});