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

        // 🔥 UMA CHAMADA SÓ - EXTRAI TUDO DE UMA VEZ
        console.log('🤖 Extraindo TUDO com IA (dados + URLs)...');
        
        const extractionResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Acesse: ${productUrl}

Extraia e retorne em JSON:
1. title: Nome COMPLETO do produto (marca + modelo + especificações + cor)
2. price: Preço À VISTA em REAIS como NUMBER (exemplo: 3299.90)
3. description: Descrição DETALHADA com especificações técnicas (mínimo 200 caracteres)
4. image_urls: Array com URLs de TODAS as imagens do produto em ALTA RESOLUÇÃO

IMPORTANTE PARA IMAGENS:
• Busque imagens em ALTA RESOLUÇÃO (-F.jpg, -O.jpg, -F.webp, _large.jpg)
• Se encontrar galeria/carousel, pegue TODAS as fotos diferentes
• Retorne NO MÍNIMO 6 URLs DIFERENTES
• Inclua diferentes ângulos: frente, verso, lateral, detalhe
• ❌ NÃO DUPLIQUE URLs
• ❌ NÃO use miniaturas (-I.jpg, _thumb)

Se houver preço parcelado E à vista, use o À VISTA.`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    price: { type: "number" },
                    description: { type: "string" },
                    image_urls: { 
                        type: "array", 
                        items: { type: "string" },
                        minItems: 6
                    }
                },
                required: ["title", "description", "image_urls"]
            }
        });

        let { title, description, price, image_urls } = extractionResult;
        
        console.log(`✅ IA retornou: ${image_urls?.length || 0} URLs`);
        
        // LIMPA E VALIDA URLs
        const urlSet = new Set();
        let imageUrls = (image_urls || [])
            .filter(u => u && typeof u === 'string' && u.startsWith('http'))
            .map(u => {
                let cleaned = u.split('?')[0].split('"')[0].split('&quot;')[0].split(' ')[0].trim();
                cleaned = cleaned.replace(/\/+$/, '');
                return cleaned;
            })
            .filter(u => {
                if (u.length < 20) return false;
                if (urlSet.has(u)) return false;
                urlSet.add(u);
                return true;
            });

        console.log(`✅ Dados: título=${!!title}, preço=${price || 'não encontrado'}, desc=${!!description}`);

        // LIMPA E VALIDA URLs - REMOVE DUPLICATAS VERDADEIRAS
        const urlSet = new Set();
        imageUrls = (imageUrls || [])
            .filter(u => u && typeof u === 'string' && u.startsWith('http'))
            .map(u => {
                // Remove query params e caracteres especiais
                let cleaned = u.split('?')[0].split('"')[0].split('&quot;')[0].split(' ')[0].trim();
                // Remove trailing slashes
                cleaned = cleaned.replace(/\/+$/, '');
                return cleaned;
            })
            .filter(u => {
                if (u.length < 20) return false;
                if (urlSet.has(u)) return false; // Remove duplicata REAL
                urlSet.add(u);
                return true;
            });

        console.log(`🧹 ${imageUrls.length} URLs únicas após limpeza`);

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

        console.log(`🔍 Processando ${imageUrls.length} imagens...`);

        // 🔥 BAIXA E RE-HOSPEDA IMAGENS
        const rehostedUrls = [];
        for (const url of imageUrls.slice(0, 8)) {
            try {
                console.log(`📥 Baixando: ${url.substring(0, 60)}...`);

                const imgResponse = await fetch(url, {
                    headers: {
                        "User-Agent": getRandomUA(),
                        "Referer": productUrl,
                        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8"
                    },
                    signal: AbortSignal.timeout(10000)
                });

                if (!imgResponse.ok) {
                    console.log(`❌ HTTP ${imgResponse.status}`);
                    continue;
                }

                const blob = await imgResponse.blob();
                
                // Cria File object (UploadFile esperado pela integração)
                const file = new File([blob], `product-img-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });

                // Usa SDK corretamente
                const uploadData = await base44.asServiceRole.integrations.Core.UploadFile({ file });

                if (uploadData?.file_url) {
                    rehostedUrls.push(uploadData.file_url);
                    console.log(`✅ Re-hospedada!`);
                }
            } catch (error) {
                console.log(`❌ Erro: ${error.message}`);
            }
        }

        console.log(`✅ ${rehostedUrls.length} imagens re-hospedadas`);

        return Response.json({
            title: (title || 'Produto').substring(0, 200),
            description: (description || 'Produto importado').substring(0, 500),
            price: price || null,
            imageUrls: rehostedUrls,
            marketplace: marketplace
        });

    } catch (error) {
        console.error('❌', error);
        return Response.json({
            error: "Erro ao processar",
            details: error.message
        }, { status: 500 });
    }
});