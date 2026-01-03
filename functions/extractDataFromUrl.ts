import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
];

const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

function decodeHtml(text) {
    if (!text) return "";
    return text.replace(/&quot;/g, '"')
               .replace(/&apos;/g, "'")
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&amp;/g, '&')
               .replace(/&#39;/g, "'")
               .replace(/&#x27;/g, "'");
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ error: "URL do produto é obrigatória" }, { status: 400 });
        }

        console.log(`🔍 Iniciando extração: ${productUrl}`);

        // IDENTIFICA MARKETPLACE
        const url = productUrl.toLowerCase();
        let marketplace = 'unknown';
        if (url.includes('mercadolivre') || url.includes('mercadolibre')) marketplace = 'mercadolivre';
        else if (url.includes('shopee')) marketplace = 'shopee';
        else if (url.includes('amazon')) marketplace = 'amazon';
        else if (url.includes('magazineluiza') || url.includes('magalu')) marketplace = 'magazineluiza';
        else if (url.includes('casasbahia')) marketplace = 'casasbahia';
        else if (url.includes('pontofrio')) marketplace = 'pontofrio';
        else if (url.includes('carrefour')) marketplace = 'carrefour';
        else if (url.includes('aliexpress')) marketplace = 'aliexpress';

        console.log(`🏪 Marketplace: ${marketplace}`);

        // BUSCA HTML COM RETRY
        let html = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const resp = await fetch(productUrl, {
                    headers: {
                        "User-Agent": getRandomUA(),
                        "Accept": "text/html,application/xhtml+xml",
                        "Accept-Language": "pt-BR,pt;q=0.9",
                        "Cache-Control": "no-cache"
                    },
                    redirect: 'follow',
                    signal: AbortSignal.timeout(15000)
                });

                if (resp.ok) {
                    html = await resp.text();
                    console.log(`✅ HTML: ${html.length} chars`);
                    break;
                }
            } catch (error) {
                if (attempt === 2) {
                    return Response.json({
                        error: "Site bloqueou acesso",
                        suggestion: "Copie dados manualmente"
                    });
                }
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        if (!html) {
            return Response.json({
                error: "Falha ao acessar página",
                suggestion: "Verifique o link"
            });
        }

        // USA IA COM TRECHO REDUZIDO (15KB)
        const htmlSnippet = html.substring(0, 15000);
        
        let title = '';
        let description = '';
        
        try {
            console.log('🤖 Processando com IA...');
            
            const aiResponse = await base44.integrations.Core.InvokeLLM({
                prompt: `Extraia do HTML abaixo:
1. Título completo do produto
2. Descrição com características principais

MARKETPLACE: ${marketplace}

HTML (primeiros 15KB):
${htmlSnippet}

Retorne JSON puro sem markdown.`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        description: { type: "string" }
                    },
                    required: ["title", "description"]
                }
            });

            title = aiResponse.title || '';
            description = aiResponse.description || '';
            console.log('✅ IA extraiu título e descrição');
            
        } catch (aiError) {
            console.warn('⚠️ IA falhou, usando regex:', aiError.message);
            
            // FALLBACK REGEX
            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            title = decodeHtml(titleMatch ? titleMatch[1] : '').split('|')[0].trim();
            
            const descMatch = html.match(/<meta\s+(?:name|property)=["'](?:description|og:description)["']\s+content=["']([^"']*)["']/i);
            description = decodeHtml(descMatch ? descMatch[1] : '');
        }

        // EXTRAI IMAGENS POR MARKETPLACE
        let imageUrls = [];
        
        if (marketplace === 'mercadolivre') {
            const mlRegex = /https?:\/\/http2\.mlstatic\.com\/D_NQ_NP_[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi;
            imageUrls = [...new Set(html.match(mlRegex) || [])].slice(0, 10);
            
        } else if (marketplace === 'amazon') {
            const amazonRegex = /https?:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_-]+\.(?:jpg|jpeg|png|webp)/gi;
            const matches = html.match(amazonRegex) || [];
            imageUrls = [...new Set(matches)]
                .filter(url => !url.includes('_US100_') && !url.includes('_SL75_'))
                .slice(0, 10);
            
        } else if (marketplace === 'shopee') {
            const shopeeRegex = /https?:\/\/[^"'\s<>]*\.shopee\.com\.br\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi;
            imageUrls = [...new Set(html.match(shopeeRegex) || [])]
                .filter(url => !url.includes('logo'))
                .slice(0, 10);
            
        } else if (marketplace === 'magazineluiza') {
            const magaluRegex = /https?:\/\/[^"'\s<>]*magazineluiza[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi;
            imageUrls = [...new Set(html.match(magaluRegex) || [])].slice(0, 10);
            
        } else if (marketplace === 'casasbahia' || marketplace === 'pontofrio') {
            const cbRegex = /https?:\/\/[^"'\s<>]*(?:casasbahia|pontofrio)[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi;
            imageUrls = [...new Set(html.match(cbRegex) || [])].slice(0, 10);
            
        } else if (marketplace === 'carrefour') {
            const carrefourRegex = /https?:\/\/[^"'\s<>]*carrefour[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi;
            imageUrls = [...new Set(html.match(carrefourRegex) || [])].slice(0, 10);
            
        } else if (marketplace === 'aliexpress') {
            const aliRegex = /https?:\/\/[^"'\s<>]*alicdn\.com[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi;
            imageUrls = [...new Set(html.match(aliRegex) || [])].slice(0, 10);
        }
        
        // FALLBACK GENÉRICO
        if (imageUrls.length === 0) {
            const genericRegex = /https?:\/\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi;
            imageUrls = [...new Set(html.match(genericRegex) || [])]
                .filter(url => {
                    const lower = url.toLowerCase();
                    return !lower.includes('logo') && 
                           !lower.includes('icon') && 
                           !lower.includes('sprite') &&
                           url.length > 50;
                })
                .slice(0, 8);
        }

        console.log(`✅ Extração completa: ${imageUrls.length} imagens`);

        return Response.json({
            title: (title || 'Produto').substring(0, 200),
            description: (description || 'Descrição não disponível').substring(0, 500),
            imageUrls: imageUrls,
            marketplace: marketplace
        });

    } catch (error) {
        console.error('❌ Erro:', error);
        return Response.json({
            error: "Erro ao processar",
            details: error.message
        }, { status: 500 });
    }
});