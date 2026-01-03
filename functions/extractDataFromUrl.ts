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

// EXTRAI IMAGENS POR MARKETPLACE
function extractImagesByMarketplace(html, marketplace) {
    const imageUrls = [];
    
    if (marketplace === 'mercadolivre') {
        // Mercado Livre: busca URLs específicas
        const mlRegex = /https?:\/\/http2\.mlstatic\.com\/[^"'\s<>()]+\.(?:jpg|jpeg|png|webp)/gi;
        const mlMatches = html.match(mlRegex) || [];
        imageUrls.push(...mlMatches.map(url => url.replace(/-[A-Z]\.(jpg|jpeg|png|webp)$/i, '-F.$1')));
        
    } else if (marketplace === 'amazon') {
        // Amazon: busca padrão /images/I/
        const amazonRegex = /https?:\/\/[^"'\s<>()]*\/images\/I\/[^"'\s<>()]+\.(?:jpg|jpeg|png|webp)/gi;
        imageUrls.push(...(html.match(amazonRegex) || []));
        
    } else if (marketplace === 'shopee') {
        // Shopee: busca URLs específicas
        const shopeeRegex = /https?:\/\/[^"'\s<>()]*shopee[^"'\s<>()]*\.(?:jpg|jpeg|png|webp)/gi;
        const shopeeMatches = html.match(shopeeRegex) || [];
        imageUrls.push(...shopeeMatches.filter(url => !url.includes('logo') && !url.includes('icon')));
        
    } else if (marketplace === 'magazineluiza' || marketplace === 'casasbahia' || marketplace === 'pontofrio') {
        // Magazine Luiza / Casas Bahia / Ponto Frio
        const magazineRegex = /https?:\/\/[^"'\s<>()]*(?:magazineluiza|casasbahia|pontofrio)[^"'\s<>()]*\.(?:jpg|jpeg|png|webp)/gi;
        imageUrls.push(...(html.match(magazineRegex) || []));
        
    } else if (marketplace === 'carrefour') {
        // Carrefour
        const carrefourRegex = /https?:\/\/[^"'\s<>()]*carrefour[^"'\s<>()]*\.(?:jpg|jpeg|png|webp)/gi;
        imageUrls.push(...(html.match(carrefourRegex) || []));
        
    } else if (marketplace === 'aliexpress') {
        // AliExpress
        const aliRegex = /https?:\/\/[^"'\s<>()]*alicdn[^"'\s<>()]*\.(?:jpg|jpeg|png|webp)/gi;
        imageUrls.push(...(html.match(aliRegex) || []));
    }
    
    // FALLBACK: Busca genérica
    if (imageUrls.length === 0) {
        const genericRegex = /https?:\/\/[^"'\s<>()]+\.(?:jpg|jpeg|png|webp)/gi;
        const allMatches = html.match(genericRegex) || [];
        imageUrls.push(...allMatches.filter(url => {
            const urlLower = url.toLowerCase();
            return !urlLower.includes('logo') && 
                   !urlLower.includes('icon') && 
                   !urlLower.includes('sprite') &&
                   !urlLower.includes('banner');
        }));
    }
    
    // Remove duplicatas e limita
    const uniqueUrls = [...new Set(imageUrls)]
        .filter(url => url.length > 40)
        .slice(0, 12);
    
    return uniqueUrls;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ error: "URL do produto é obrigatória" }, { status: 400 });
        }

        console.log(`🔍 Extraindo dados de: ${productUrl}`);

        // IDENTIFICA O MARKETPLACE
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

        // BUSCA HTML
        let html = null;
        let fetchError = null;

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const resp = await fetch(productUrl, {
                    headers: {
                        "User-Agent": getRandomUA(),
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
                        "Cache-Control": "no-cache"
                    },
                    redirect: 'follow',
                    signal: AbortSignal.timeout(15000)
                });

                if (resp.ok) {
                    html = await resp.text();
                    console.log(`✅ HTML obtido (${html.length} chars)`);
                    break;
                }

                fetchError = `HTTP ${resp.status}`;
            } catch (error) {
                fetchError = error.message;
                if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
            }
        }

        if (!html) {
            return Response.json({
                error: "Não foi possível acessar a página",
                suggestion: "Copie os dados manualmente ou tente outro link",
                marketplace: marketplace
            });
        }

        // EXTRAI IMAGENS POR MARKETPLACE
        const imageUrls = extractImagesByMarketplace(html, marketplace);
        console.log(`📸 ${imageUrls.length} imagens encontradas`);

        // EXTRAI TÍTULO E DESCRIÇÃO COM REGEX
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        let title = decodeHtml(titleMatch ? titleMatch[1] : '');
        title = title.split('|')[0].split(' - ')[0].trim();
        
        const descMatch = html.match(/<meta\s+(?:name|property)=["'](?:description|og:description)["']\s+content=["']([^"']*)["']/i);
        let description = decodeHtml(descMatch ? descMatch[1] : '');

        // SE TÍTULO/DESCRIÇÃO VAZIOS, USA IA EM TRECHO MENOR
        if (!title || title.length < 10 || !description || description.length < 20) {
            console.log('🤖 Usando IA para extrair título/descrição...');
            
            try {
                // Pega apenas os primeiros 15KB do HTML
                const htmlSnippet = html.substring(0, 15000);
                
                const aiResponse = await base44.integrations.Core.InvokeLLM({
                    prompt: `Extraia o TÍTULO e DESCRIÇÃO deste produto de e-commerce (${marketplace}).
                    
HTML: ${htmlSnippet}

Retorne JSON:
{
  "title": "título completo do produto",
  "description": "descrição detalhada com características"
}`,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            description: { type: "string" }
                        }
                    }
                });

                if (aiResponse?.title) title = aiResponse.title;
                if (aiResponse?.description) description = aiResponse.description;
                
            } catch (aiError) {
                console.warn('⚠️ IA falhou, usando valores extraídos:', aiError.message);
            }
        }

        // FALLBACK FINAL
        if (!title || title.length < 5) title = 'Produto Importado';
        if (!description || description.length < 10) description = 'Produto importado de ' + marketplace;

        return Response.json({
            title: title.substring(0, 200),
            description: description.substring(0, 500),
            imageUrls: imageUrls,
            marketplace: marketplace
        });

    } catch (error) {
        console.error('❌ Erro geral:', error);
        return Response.json({
            error: "Erro ao processar URL",
            details: error.message
        }, { status: 500 });
    }
});