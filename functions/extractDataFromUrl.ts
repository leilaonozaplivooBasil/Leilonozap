import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
];

const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

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

        console.log(`🏪 Marketplace detectado: ${marketplace}`);

        // TENTA BUSCAR O HTML
        let html = null;
        let fetchError = null;

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const resp = await fetch(productUrl, {
                    headers: {
                        "User-Agent": getRandomUA(),
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
                        "Accept-Encoding": "gzip, deflate, br",
                        "Cache-Control": "no-cache",
                        "Pragma": "no-cache",
                        "Sec-Fetch-Dest": "document",
                        "Sec-Fetch-Mode": "navigate",
                        "Sec-Fetch-Site": "none",
                        "Upgrade-Insecure-Requests": "1"
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
                console.warn(`⚠️ Tentativa ${attempt + 1} falhou: ${fetchError}`);
                
            } catch (error) {
                fetchError = error.message;
                console.warn(`⚠️ Tentativa ${attempt + 1} erro: ${fetchError}`);
                if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
            }
        }

        if (!html) {
            console.error(`❌ Todas as tentativas falharam para ${productUrl}`);
            return Response.json({
                error: "Não foi possível acessar a página",
                suggestion: "Site pode estar bloqueando robôs. Tente copiar dados manualmente",
                details: fetchError,
                marketplace: marketplace
            });
        }

        // 🤖 USA IA PARA EXTRAIR DADOS ESTRUTURADOS
        console.log('🤖 Processando com IA...');
        
        const aiPrompt = `Você é um extrator de dados de produtos para e-commerce. Analise o HTML fornecido e extraia:

1. **Título do produto**: Nome completo e preciso
2. **Descrição**: Descrição detalhada com características principais
3. **URLs de imagens**: TODAS as URLs de imagens do produto (mínimo 3, máximo 10)

IMPORTANTE SOBRE IMAGENS:
- Busque URLs COMPLETAS que começam com http:// ou https://
- Priorize imagens GRANDES do produto (não thumbnails)
- Ignore logos, ícones, banners, sprites
- Para Mercado Livre: busque URLs com "/D_NQ_NP_" (alta qualidade)
- Para Amazon: busque URLs com "/images/I/" 
- Para Shopee: busque URLs com "shopee.com.br" e extensões .jpg, .png, .webp
- Para Magazine Luiza: busque URLs com "magazineluiza" 
- Retorne APENAS URLs válidas de imagens do produto

MARKETPLACE: ${marketplace}

Retorne SOMENTE JSON válido, sem texto adicional.`;

        try {
            const aiResponse = await base44.integrations.Core.InvokeLLM({
                prompt: aiPrompt,
                add_context_from_internet: false,
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
                },
                file_urls: [`data:text/html;base64,${btoa(html.substring(0, 100000))}`]
            });

            console.log('✅ IA processou os dados!');

            // VALIDA E LIMPA OS DADOS
            let { title, description, imageUrls } = aiResponse;

            // Limpa título
            title = title.split('|')[0].split(' - ')[0].trim();
            if (title.length > 100) title = title.substring(0, 97) + '...';

            // Limpa descrição
            if (description.length > 500) description = description.substring(0, 497) + '...';

            // VALIDA E FILTRA IMAGENS
            const validImageUrls = (imageUrls || [])
                .filter(url => {
                    if (!url || typeof url !== 'string') return false;
                    const urlLower = url.toLowerCase();
                    return urlLower.startsWith('http') && 
                           /\.(jpg|jpeg|png|webp)/.test(urlLower) &&
                           !urlLower.includes('logo') &&
                           !urlLower.includes('icon') &&
                           !urlLower.includes('sprite') &&
                           url.length > 40;
                })
                .map(url => {
                    // Normaliza URLs do Mercado Livre para versão -F (full size)
                    if (url.includes('mlstatic.com')) {
                        return url.replace(/-\w\.(jpg|jpeg|png|webp)$/i, '-F.$1');
                    }
                    return url;
                })
                .slice(0, 10);

            console.log(`📸 ${validImageUrls.length} imagens válidas encontradas`);

            // FALLBACK: Se IA não encontrou imagens, tenta regex tradicional
            if (validImageUrls.length === 0) {
                console.log('⚠️ IA não encontrou imagens, tentando regex...');
                
                const regex = /https?:\/\/[^"'\s<>()]+\.(jpg|jpeg|png|webp)/gi;
                const allUrls = html.match(regex) || [];
                
                const filteredUrls = allUrls
                    .filter(url => {
                        const urlLower = url.toLowerCase();
                        return !urlLower.includes('logo') &&
                               !urlLower.includes('icon') &&
                               !urlLower.includes('sprite') &&
                               !urlLower.includes('banner');
                    })
                    .map(url => url.split('?')[0])
                    .filter((url, index, self) => self.indexOf(url) === index)
                    .slice(0, 6);

                validImageUrls.push(...filteredUrls);
            }

            return Response.json({
                title: title || 'Produto',
                description: description || 'Sem descrição disponível',
                imageUrls: validImageUrls,
                marketplace: marketplace
            });

        } catch (aiError) {
            console.error('❌ Erro na IA:', aiError);
            
            // FALLBACK COMPLETO: Extração regex tradicional
            console.log('🔧 Usando extração tradicional como fallback...');
            
            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].split('|')[0].trim() : 'Produto';

            const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
            const description = descMatch ? descMatch[1] : 'Descrição não disponível';

            const regex = /https?:\/\/[^"'\s<>()]+\.(jpg|jpeg|png|webp)/gi;
            const allUrls = html.match(regex) || [];
            const imageUrls = allUrls
                .filter(url => {
                    const urlLower = url.toLowerCase();
                    return !urlLower.includes('logo') && !urlLower.includes('icon');
                })
                .map(url => url.split('?')[0])
                .filter((url, index, self) => self.indexOf(url) === index)
                .slice(0, 6);

            return Response.json({ title, description, imageUrls, marketplace });
        }

    } catch (error) {
        console.error('❌ Erro geral:', error);
        return Response.json({
            error: "Erro ao processar URL",
            details: error.message
        }, { status: 500 });
    }
});