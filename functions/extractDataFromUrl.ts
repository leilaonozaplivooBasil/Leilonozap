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

        // BUSCA HTML DIRETO
        let html = '';
        for (let i = 0; i < 2; i++) {
            try {
                const resp = await fetch(productUrl, {
                    headers: {
                        "User-Agent": getRandomUA(),
                        "Accept": "text/html,application/xhtml+xml",
                        "Accept-Language": "pt-BR,pt;q=0.9"
                    },
                    signal: AbortSignal.timeout(15000)
                });

                if (resp.ok) {
                    html = await resp.text();
                    console.log(`✅ ${html.length} chars`);
                    break;
                }
            } catch (e) {
                if (i === 1) {
                    return Response.json({
                        error: "Página inacessível",
                        suggestion: "Copie dados manualmente"
                    });
                }
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        if (!html) {
            return Response.json({
                error: "Falha ao carregar página",
                suggestion: "Verifique o link"
            });
        }

        // EXTRAI COM IA
        const snippet = html.substring(0, 15000);
        
        console.log('🤖 IA analisando HTML...');
        
        const aiResult = await base44.integrations.Core.InvokeLLM({
            prompt: `EXTRAÇÃO DE DADOS DO HTML (${marketplace.toUpperCase()}):

TAREFA:
1. Encontre o TÍTULO exato do produto
2. Descrição com especificações (3-5 linhas)
3. CRÍTICO: Extraia 5-10 URLs COMPLETAS de imagens

IMAGENS:
- URLs diretas: https://...
- Formato: .jpg, .jpeg, .png, .webp
- GRANDES (não thumb/miniatura)
- SEM logos

HTML:
${snippet}

RETORNE JSON com imageUrls OBRIGATÓRIO.`,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    imageUrls: { 
                        type: "array", 
                        items: { type: "string" },
                        minItems: 1
                    }
                },
                required: ["title", "description", "imageUrls"]
            }
        });

        let { title, description, imageUrls } = aiResult;
        
        console.log(`🤖 IA: título=${!!title}, desc=${!!description}, imgs=${imageUrls?.length || 0}`);

        // EXTRAI IMAGENS POR REGEX SE IA FALHOU
        if (!imageUrls || imageUrls.length === 0) {
            console.log('📸 Regex para imagens...');
            
            if (marketplace === 'mercadolivre') {
                const regex = /https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[^"'\s<>]+\.(?:jpg|webp)/gi;
                imageUrls = [...new Set(html.match(regex) || [])].slice(0, 10);
                
            } else if (marketplace === 'amazon') {
                const regex = /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_-]+\.jpg/gi;
                imageUrls = [...new Set(html.match(regex) || [])]
                    .filter(u => !u.includes('_US100_') && !u.includes('_SL75_'))
                    .slice(0, 10);
                    
            } else if (marketplace === 'shopee') {
                const regex = /https:\/\/[^"'\s<>]*shopee\.com\.br\/[^"'\s<>]+\.(?:jpg|png|webp)/gi;
                imageUrls = [...new Set(html.match(regex) || [])].slice(0, 10);
                
            } else {
                const regex = /https?:\/\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi;
                imageUrls = [...new Set(html.match(regex) || [])]
                    .filter(u => {
                        const l = u.toLowerCase();
                        return !l.includes('logo') && !l.includes('icon') && u.length > 50;
                    })
                    .slice(0, 8);
            }
        }

        // LIMPA URLs
        imageUrls = (imageUrls || [])
            .filter(u => u && typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://')))
            .map(u => u.split('"')[0].split('&quot;')[0].split('?')[0])
            .filter(u => u.length > 30)
            .filter((u, i, arr) => arr.indexOf(u) === i);

        console.log(`🔍 Validando ${imageUrls.length} imagens...`);

        // 🔥 VALIDA CADA IMAGEM
        const validatedUrls = [];
        for (const url of imageUrls) {
            const isValid = await validateImageUrl(url);
            if (isValid) {
                validatedUrls.push(url);
                console.log(`✅ OK: ${url.substring(0, 60)}`);
            } else {
                console.log(`❌ FALHOU: ${url.substring(0, 60)}`);
            }
            if (validatedUrls.length >= 8) break; // Máximo 8 imagens
        }

        console.log(`✅ ${validatedUrls.length} imagens validadas`);

        return Response.json({
            title: (title || 'Produto').substring(0, 200),
            description: (description || 'Produto importado').substring(0, 500),
            imageUrls: validatedUrls,
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