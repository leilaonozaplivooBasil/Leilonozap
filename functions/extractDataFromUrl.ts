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

        // USA IA COM CONTEXTO DA WEB
        console.log('🤖 Usando IA com busca na web...');
        
        const aiResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Acesse: ${productUrl}

Extraia:
1. TÍTULO completo do produto
2. DESCRIÇÃO técnica (5-8 linhas em português)

Retorne JSON limpo sem HTML.`,
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

        let { title, description } = aiResult;
        
        console.log(`🤖 IA: título=${!!title}, desc=${!!description}`);
        
        // BUSCA HTML PARA EXTRAIR IMAGENS
        console.log('📄 Buscando HTML da página...');
        let html = '';
        
        try {
            const resp = await fetch(productUrl, {
                headers: {
                    "User-Agent": getRandomUA(),
                    "Accept": "text/html",
                    "Accept-Language": "pt-BR"
                },
                signal: AbortSignal.timeout(15000)
            });

            if (resp.ok) {
                html = await resp.text();
                console.log(`✅ ${html.length} chars`);
            }
        } catch (e) {
            console.log('⚠️ Não conseguiu buscar HTML:', e.message);
        }
        
        // EXTRAI IMAGENS POR REGEX
        let imageUrls = [];
        
        if (html && marketplace === 'mercadolivre') {
            console.log('📸 Extraindo imagens do HTML...');
            const regex = /https:\/\/http2\.mlstatic\.com\/D_NQ_NP_\d+-[A-Z]{3}\d+_[A-Z]\.(?:jpg|webp)/gi;
            const matches = html.match(regex) || [];
            imageUrls = [...new Set(matches)]
                .map(u => u.replace(/_[VSWT]\./, '_O.')) // Converte para original
                .slice(0, 10);
            console.log(`📸 ${imageUrls.length} URLs encontradas`);
        }

        // LIMPA E VALIDA URLs
        imageUrls = (imageUrls || [])
            .filter(u => u && typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://')))
            .map(u => {
                // Remove parâmetros de query e aspas
                let cleanUrl = u.split('"')[0].split('&quot;')[0];
                // Para Mercado Livre, garante extensão correta
                if (marketplace === 'mercadolivre' && !cleanUrl.match(/\.(jpg|jpeg|webp|png)$/i)) {
                    cleanUrl += '.jpg';
                }
                return cleanUrl;
            })
            .filter(u => u.length > 30 && u.match(/\.(jpg|jpeg|webp|png)$/i))
            .filter((u, i, arr) => arr.indexOf(u) === i);
        
        console.log(`🧹 ${imageUrls.length} URLs limpas e validadas`);

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
                
                // Re-hospeda no Base44
                const uploadResult = await base44.integrations.Core.UploadFile({ 
                    file: blob 
                });

                if (uploadResult?.file_url) {
                    rehostedUrls.push(uploadResult.file_url);
                    console.log(`✅ Re-hospedada: ${uploadResult.file_url.substring(0, 60)}`);
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