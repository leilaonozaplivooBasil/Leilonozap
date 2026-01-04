import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// 🔥 VALIDA SE IMAGEM CARREGA REALMENTE
async function validateImageUrl(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            headers: { 'User-Agent': getRandomUA() },
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
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

        const extractionResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Busque informações sobre este produto do Mercado Livre:
        ${productUrl}

        EXTRAIA E RETORNE em português brasileiro:
        1. Título completo do produto
        2. Descrição detalhada com especificações técnicas (mínimo 6 linhas, máximo 10 linhas)
        3. URLs DIRETAS das imagens em alta resolução

        IMPORTANTE sobre as imagens do Mercado Livre:
        - As URLs começam com https://http2.mlstatic.com/
        - Use APENAS versões ORIGINAIS/GRANDES
        - NÃO use miniaturas pequenas
        - Retorne TODAS as imagens que encontrar (mínimo 5, ideal 8-10)

        Seja completo e preciso.`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    imageUrls: {
                        type: "array",
                        items: { type: "string" }
                    }
                },
                required: ["title", "description", "imageUrls"]
            }
        });

        let { title, description, imageUrls } = extractionResult;

        console.log(`✅ IA: título=${!!title}, desc=${!!description}, imgs=${imageUrls?.length || 0}`);

        // LIMPA URLs
        imageUrls = (imageUrls || [])
            .filter(u => u && typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://')))
            .map(u => u.split('"')[0].split('&quot;')[0].split(' ')[0])
            .filter((u, i, arr) => arr.indexOf(u) === i);

        console.log(`🧹 ${imageUrls.length} URLs finais para processar`);

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