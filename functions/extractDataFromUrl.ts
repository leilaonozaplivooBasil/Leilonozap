import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
];

const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ error: "URL obrigatória" }, { status: 400 });
        }

        console.log(`🔍 Extraindo: ${productUrl}`);

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

        // BUSCA PÁGINA COM IA (usando ferramenta fetch_website)
        let markdown = '';
        let html = '';
        
        try {
            // USA A INTEGRAÇÃO fetch_website DO BASE44
            const pageData = await base44.integrations.Core.FetchWebsite({
                url: productUrl,
                formats: ['markdown', 'html']
            });
            
            markdown = pageData.markdown || '';
            html = pageData.html || '';
            
            console.log(`✅ Página carregada: ${markdown.length} chars markdown`);
            
        } catch (fetchError) {
            console.warn('⚠️ Fetch website falhou, tentando fetch direto:', fetchError.message);
            
            // FALLBACK: fetch tradicional
            for (let i = 0; i < 2; i++) {
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
                        break;
                    }
                } catch (e) {
                    if (i === 1) throw new Error("Não foi possível acessar a página");
                }
            }
        }

        if (!markdown && !html) {
            return Response.json({
                error: "Página inacessível",
                suggestion: "Site pode estar bloqueando robôs"
            });
        }

        // EXTRAI DADOS COM IA (usando markdown que é menor)
        const contentToAnalyze = markdown || html.substring(0, 20000);
        
        console.log('🤖 Usando IA para extrair dados...');
        
        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt: `Extraia dados deste produto de e-commerce (${marketplace}):

${contentToAnalyze}

INSTRUÇÕES:
1. Título: nome completo do produto
2. Descrição: características principais (2-3 linhas)
3. Imagens: encontre URLs completas de imagens do produto (não logos/ícones)

Retorne JSON puro.`,
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
                required: ["title", "description"]
            }
        });

        let { title, description, imageUrls } = aiResponse;

        // EXTRAI IMAGENS DO HTML SE IA NÃO ENCONTROU
        if (!imageUrls || imageUrls.length === 0) {
            console.log('📸 Extraindo imagens por regex...');
            imageUrls = [];
            
            const source = html || markdown;
            
            if (marketplace === 'mercadolivre') {
                const mlRegex = /https?:\/\/http2\.mlstatic\.com\/D_NQ_NP_[^"'\s<>]+\.(?:jpg|webp|png)/gi;
                imageUrls = [...new Set(source.match(mlRegex) || [])];
                
            } else if (marketplace === 'amazon') {
                const amzRegex = /https?:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_-]+\.jpg/gi;
                const matches = source.match(amzRegex) || [];
                imageUrls = [...new Set(matches)].filter(url => 
                    !url.includes('_US100_') && 
                    !url.includes('_SL75_') &&
                    !url.includes('sprite')
                );
                
            } else if (marketplace === 'shopee') {
                const shopeeRegex = /https?:\/\/[^"'\s<>]*\.shopee\.com\.br\/[^"'\s<>]+\.(?:jpg|png|webp)/gi;
                imageUrls = [...new Set(source.match(shopeeRegex) || [])];
                
            } else {
                // GENÉRICO
                const genericRegex = /https?:\/\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi;
                imageUrls = [...new Set(source.match(genericRegex) || [])]
                    .filter(url => {
                        const lower = url.toLowerCase();
                        return !lower.includes('logo') && 
                               !lower.includes('icon') && 
                               url.length > 50;
                    });
            }
            
            imageUrls = imageUrls.slice(0, 12);
        }

        // LIMPA URLs
        imageUrls = (imageUrls || [])
            .filter(url => url && typeof url === 'string' && url.startsWith('http'))
            .map(url => url.split('&quot;')[0].split('"')[0])
            .filter(url => url.length > 30);

        console.log(`✅ ${imageUrls.length} imagens`);

        return Response.json({
            title: (title || 'Produto').substring(0, 200),
            description: (description || 'Produto importado').substring(0, 500),
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