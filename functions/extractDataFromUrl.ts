import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
];

const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

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

        // 🔥 EXTRAI ID DO PRODUTO PARA USAR API DO MERCADO LIVRE
        let productId = null;
        if (marketplace === 'mercadolivre') {
            const mlbMatch = productUrl.match(/\/p\/(MLB\d+)/);
            if (mlbMatch) {
                productId = mlbMatch[1];
                console.log(`🎯 ID do produto: ${productId}`);
            }
        }

        let title = '';
        let description = '';
        let imageUrls = [];

        // 📸 USA API PÚBLICA DO MERCADO LIVRE
        if (productId && marketplace === 'mercadolivre') {
            try {
                console.log('🔍 Buscando via API do Mercado Livre...');

                const apiResp = await fetch(`https://api.mercadolibre.com/items/${productId}`, {
                    signal: AbortSignal.timeout(10000)
                });

                if (apiResp.ok) {
                    const data = await apiResp.json();

                    title = data.title || '';

                    // Extrai imagens da API
                    const rawImages = (data.pictures || [])
                        .map(p => p.secure_url || p.url)
                        .filter(u => u && u.includes('http2.mlstatic.com'));

                    console.log(`✅ API ML retornou ${rawImages.length} URLs de imagem`);
                    console.log('📸 Primeiras URLs:', rawImages.slice(0, 3));

                    // Converte para versão ORIGINAL (_O)
                    imageUrls = rawImages
                        .map(u => {
                            // Remove query params
                            const cleanUrl = u.split('?')[0];
                            // Garante versão ORIGINAL
                            return cleanUrl.replace(/_[VSWT]\./, '_O.');
                        })
                        .slice(0, 10);

                    console.log(`✅ ${imageUrls.length} URLs processadas para versão original`);

                    // Busca descrição completa se disponível
                    try {
                        const descResp = await fetch(`https://api.mercadolibre.com/items/${productId}/description`, {
                            signal: AbortSignal.timeout(8000)
                        });
                        if (descResp.ok) {
                            const descData = await descResp.json();
                            description = descData.plain_text || data.title || '';
                        }
                    } catch (e) {
                        description = data.title || '';
                    }
                }
            } catch (e) {
                console.log('⚠️ API ML falhou:', e.message);
            }
        }

        // 🤖 FALLBACK: USA IA SE API FALHOU
        if (!title || !description) {
            console.log('🤖 Fallback: usando IA...');

            const extractionResult = await base44.integrations.Core.InvokeLLM({
                prompt: `Extraia do Mercado Livre:
        URL: ${productUrl}

        RETORNE:
        1. Título do produto
        2. Descrição com especificações (6-10 linhas em português)`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        description: { type: "string" }
                    },
                    required: ["title", "description"]
                }
            });

            title = title || extractionResult.title;
            description = description || extractionResult.description;
        }

        console.log(`✅ Dados: título=${!!title}, desc=${!!description}, imgs=${imageUrls?.length || 0}`);

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