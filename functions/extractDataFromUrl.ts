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

        // 🔥 EXTRAÇÃO EM DUAS ETAPAS - DADOS + IMAGENS SEPARADAS
        console.log('🤖 ETAPA 1: Extraindo dados básicos...');
        
        const basicDataResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Acesse: ${productUrl}

Extraia:
1. title: Nome COMPLETO do produto
2. price: Preço À VISTA em REAIS como NUMBER
3. description: Descrição DETALHADA (mínimo 200 caracteres)`,
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
        
        console.log('✅ ETAPA 1:', basicDataResult);
        
        console.log('🖼️ ETAPA 2: Baixando HTML e extraindo URLs com REGEX...');
        
        // 🔥 BAIXA HTML DIRETO
        let imageUrls = [];
        try {
            console.log(`📥 Fetch: ${productUrl}`);
            const fetchResponse = await fetch(productUrl, {
                headers: {
                    'User-Agent': getRandomUA(),
                    'Accept': 'text/html',
                    'Accept-Language': 'pt-BR'
                }
            });
            
            if (fetchResponse.ok) {
                const pageHtml = await fetchResponse.text();
                console.log(`✅ HTML baixado: ${pageHtml.length} chars`);
                
                // 🔥 REGEX PARA MERCADO LIVRE (TODOS OS FORMATOS)
                if (marketplace === 'mercadolivre') {
                    // Busca TODAS as URLs do mlstatic.com (qualquer formato)
                    const mlRegex = /https?:\/\/http2\.mlstatic\.com\/D_[^"'\s]+\.(?:webp|jpg|jpeg|png)/gi;
                    const matches = [...pageHtml.matchAll(mlRegex)];
                    
                    console.log(`🔍 REGEX encontrou ${matches.length} URLs de imagens do mlstatic`);
                    
                    // Remove duplicatas mantendo ordem
                    const seen = new Set();
                    imageUrls = matches
                        .map(m => m[0].split('?')[0]) // Remove query params
                        .filter(url => {
                            // Extrai código único (ex: 865332)
                            const codeMatch = url.match(/2X_(\d+)-/);
                            const code = codeMatch ? codeMatch[1] : url;
                            
                            // Ignora miniaturas muito pequenas
                            if (url.includes('_O.') || url.includes('_S.')) return false;
                            
                            if (seen.has(code)) return false;
                            seen.add(code);
                            return true;
                        })
                        .slice(0, 6);
                    
                    console.log(`✅ REGEX filtrado: ${imageUrls.length} imagens ÚNICAS`);
                    imageUrls.forEach((url, i) => {
                        const codeMatch = url.match(/2X_(\d+)-/);
                        console.log(`  ${i + 1}. Código ${codeMatch ? codeMatch[1] : '?'}: ${url}`);
                    });
                }
                
                // Se REGEX não encontrou imagens suficientes, tenta outros padrões
                if (imageUrls.length < 3) {
                    console.log(`⚠️ REGEX retornou ${imageUrls.length} imagens, tentando padrões alternativos...`);
                    
                    // Padrão genérico para qualquer marketplace
                    const genericRegex = /https?:\/\/[^"'\s]+?\.(?:jpg|jpeg|png|webp)/gi;
                    const allMatches = [...pageHtml.matchAll(genericRegex)];
                    
                    imageUrls = allMatches
                        .map(m => m[0])
                        .filter(url => {
                            // Filtra apenas URLs de produto (não CDN de UI, logos, etc)
                            return !url.includes('logo') && 
                                   !url.includes('icon') && 
                                   !url.includes('btn') &&
                                   !url.includes('sprite') &&
                                   url.length > 40; // URLs de produto geralmente são longas
                        })
                        .slice(0, 6);
                    
                    console.log(`📸 Padrão genérico encontrou ${imageUrls.length} imagens`);
                }
            } else {
                console.warn(`⚠️ Fetch retornou ${fetchResponse.status}`);
            }
        } catch (fetchError) {
            console.warn(`⚠️ Erro no fetch: ${fetchError.message}`);
        }
        
        // 🆕 SE REGEX NÃO ENCONTROU NADA, USA IA COMO FALLBACK
        if (imageUrls.length === 0) {
            console.log(`🤖 REGEX falhou, tentando com IA...`);
            
            const imagesResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: `ACESSE: ${productUrl}

EXTRAIA 3-6 URLs DE IMAGENS DO PRODUTO.

⚠️ COPIE URLs REAIS DO HTML:
- Mercado Livre: https://http2.mlstatic.com/D_NQ_NP_2X_CODIGO-MLB...
- Amazon: https://m.media-amazon.com/images/I/CODIGO...

NÃO INVENTE! COPIE do código fonte!`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        image_urls: { 
                            type: "array", 
                            items: { type: "string" }
                        }
                    }
                }
            });
            
            imageUrls = imagesResult.image_urls || [];
            console.log(`🤖 IA retornou ${imageUrls.length} URLs`);
        }
        
        console.log('✅ ETAPA 2 - URLs finais:', imageUrls);
        
        const extractionResult = {
            ...basicDataResult,
            image_urls: imageUrls
        };

        let { title, description, price } = basicDataResult;
        let { image_urls } = extractionResult;
        
        console.log(`✅ IA retornou: ${image_urls?.length || 0} URLs de imagens`);
        
        // LIMPA URLs (remove duplicatas e URLs inválidas)
        const urlSet = new Set();
        const imageUrls = (image_urls || [])
            .filter(u => u && typeof u === 'string' && u.startsWith('http'))
            .map(u => u.split('?')[0].trim().replace(/\/+$/, ''))
            .filter(u => {
                if (u.length < 20 || urlSet.has(u)) return false;
                urlSet.add(u);
                return true;
            });

        console.log(`✅ ${imageUrls.length} URLs únicas prontas para download`);

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

        console.log(`✅ ${imageUrls.length} URLs originais encontradas`);
        console.log(`📤 [BACKEND] RETORNANDO URLs ORIGINAIS (SEM DOWNLOAD):`);
        console.log(`   title: ${title || 'Produto'}`);
        console.log(`   price: ${price || null}`);
        console.log(`   imageUrls (${imageUrls.length}):`, imageUrls);

        const finalResponse = {
            title: (title || 'Produto').substring(0, 200),
            description: (description || 'Produto importado').substring(0, 500),
            price: price || null,
            imageUrls: imageUrls, // URLs ORIGINAIS
            marketplace: marketplace
        };

        console.log(`🚀 [BACKEND] JSON FINAL:`, JSON.stringify(finalResponse));

        return Response.json(finalResponse);

    } catch (error) {
        console.error('❌', error);
        return Response.json({
            error: "Erro ao processar",
            details: error.message
        }, { status: 500 });
    }
});