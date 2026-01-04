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

        // 🤖 USA APENAS IA COM WEB SEARCH (método mais confiável)
        console.log('🤖 IA buscando produto na web...');

        // 🆕 DUAS CHAMADAS: 1ª para dados, 2ª FORÇADA para imagens
        const extractionResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Acesse esta página do Mercado Livre e extraia:
${productUrl}

RETORNE:
1. title: Nome completo (marca + modelo + cor)
2. price: Preço À VISTA em reais como NUMBER
3. description: Descrição com especificações (150-500 caracteres)

Seja preciso!`,
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

        let { title, description, price } = extractionResult;

        console.log(`✅ IA (dados): título=${!!title}, preço=${price || 'não encontrado'}, desc=${!!description}`);

        // 🆕 BUSCA SEPARADA E FORÇADA PARA IMAGENS
        console.log('🖼️ Buscando imagens separadamente...');
        
        const imageResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Acesse: ${productUrl}

Encontre e retorne URLs DIRETAS das imagens DO PRODUTO.

IMPORTANTE:
- URLs devem começar com https://http2.mlstatic.com/
- Use versões GRANDES: -F.webp, -F.jpg, -O.jpg (NÃO use -I.jpg ou thumbnails)
- Retorne NO MÍNIMO 6 URLs DIFERENTES
- URLs completas e válidas

Exemplo: https://http2.mlstatic.com/D_NQ_NP_2X_988019-MLB52201901945_112022-F.webp`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    imageUrls: { 
                        type: "array", 
                        items: { type: "string" },
                        minItems: 6
                    }
                },
                required: ["imageUrls"]
            }
        });

        let imageUrls = (imageResult?.imageUrls || [])
            .filter(u => u && typeof u === 'string' && u.startsWith('http'))
            .map(u => u.split('"')[0].split('&quot;')[0].split(' ')[0].trim())
            .filter((u, i, arr) => arr.indexOf(u) === i)
            .filter(u => u.length > 20);

        console.log(`✅ IA (imagens): ${imageUrls.length} URLs encontradas`);

        // Se ainda não encontrou, retorna sem imagens
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

        console.log(`🔍 Processando ${imageUrls.length} imagens do ${marketplace}...`);

        // 🔥 BAIXA E RE-HOSPEDA IMAGENS (evita bloqueio anti-hotlink)
        const rehostedUrls = [];
        for (const url of imageUrls.slice(0, 8)) {
            try {
                console.log(`📥 Baixando: ${url.substring(0, 60)}...`);

                // Baixa a imagem
                const imgResponse = await fetch(url, {
                    headers: {
                        "User-Agent": getRandomUA(),
                        "Referer": productUrl,
                        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8"
                    },
                    signal: AbortSignal.timeout(10000)
                });

                if (!imgResponse.ok) {
                    console.log(`❌ HTTP ${imgResponse.status}: ${url.substring(0, 60)}`);
                    continue;
                }

                const blob = await imgResponse.blob();

                // Cria FormData para upload correto
                const formData = new FormData();
                formData.append('file', blob, `image-${Date.now()}-${rehostedUrls.length}.jpg`);

                // Re-hospeda no Base44 usando fetch direto
                const uploadResponse = await fetch(`${base44.baseUrl}/integrations/Core/UploadFile`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${base44.token}`,
                    },
                    body: formData
                });

                if (uploadResponse.ok) {
                    const uploadData = await uploadResponse.json();
                    if (uploadData?.file_url) {
                        rehostedUrls.push(uploadData.file_url);
                        console.log(`✅ Re-hospedada: ${uploadData.file_url.substring(0, 60)}`);
                    }
                } else {
                    console.log(`❌ Upload falhou: ${uploadResponse.status}`);
                }
            } catch (error) {
                console.log(`❌ Erro: ${url.substring(0, 60)} - ${error.message}`);
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