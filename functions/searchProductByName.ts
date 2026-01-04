import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// 🔥 VALIDAÇÃO AVANÇADA DE IMAGENS
async function validateImageUrl(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
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

// 🎯 SCORE DE RELEVÂNCIA DA IMAGEM
function calculateImageScore(url, productName) {
    let score = 0;
    const lowerUrl = url.toLowerCase();
    const lowerProduct = productName.toLowerCase();
    
    // ❌ PENALIDADES - Imagens ruins
    if (lowerUrl.match(/logo|icon|banner|sprite|button|arrow|star|badge|seal|stamp/i)) score -= 100;
    if (lowerUrl.includes('thumbnail') || lowerUrl.includes('thumb')) score -= 50;
    if (lowerUrl.includes('avatar') || lowerUrl.includes('user')) score -= 100;
    if (lowerUrl.match(/\d{1,3}x\d{1,3}/)) score -= 30; // Dimensões pequenas no nome
    if (lowerUrl.includes('az-request')) score -= 200; // Mercado Livre bug
    
    // ✅ BONIFICAÇÕES - CDNs confiáveis de produtos
    if (lowerUrl.includes('mlstatic.com')) score += 50;
    if (lowerUrl.includes('amazonaws.com') || lowerUrl.includes('cloudfront')) score += 40;
    if (lowerUrl.includes('shopee') || lowerUrl.includes('magazineluiza')) score += 40;
    if (lowerUrl.includes('images-')) score += 30;
    if (lowerUrl.includes('product') || lowerUrl.includes('produto')) score += 30;
    
    // ✅ Nome do arquivo contém palavras do produto
    const productWords = lowerProduct.split(' ').filter(w => w.length > 3);
    productWords.forEach(word => {
        if (lowerUrl.includes(word)) score += 20;
    });
    
    // ✅ Extensões de imagem de qualidade
    if (lowerUrl.match(/\.(jpg|jpeg|webp|png)$/i)) score += 10;
    
    // ✅ Galeria de produtos (padrões comuns)
    if (lowerUrl.match(/gallery|galeria|slide|carousel|zoom/i)) score += 25;
    
    // ✅ URL longa geralmente = imagem de produto
    if (lowerUrl.length > 100) score += 15;
    
    return score;
}

// 🤖 VALIDAÇÃO COM IA VISION
async function validateImageWithAI(imageUrl, productName, base44) {
    try {
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Você está vendo uma imagem de um produto.

PRODUTO BUSCADO: "${productName}"

RESPONDA:
- Esta imagem mostra o produto "${productName}"? (sim/não)
- Justificativa em 1 linha

REGRAS:
- Se for logo, ícone, banner, pessoa, texto: responda NÃO
- Se for o produto real: responda SIM`,
            file_urls: [imageUrl],
            response_json_schema: {
                type: "object",
                properties: {
                    isProduct: { type: "boolean" },
                    reason: { type: "string" }
                },
                required: ["isProduct", "reason"]
            }
        });
        
        console.log(`🤖 IA Vision: ${result.isProduct ? '✅' : '❌'} - ${result.reason}`);
        return result.isProduct;
    } catch (error) {
        console.log(`⚠️ IA Vision falhou: ${error.message}`);
        return true; // Fallback: assume válida se IA falhar
    }
}

// 🧹 DEDUPLICAÇÃO INTELIGENTE
function deduplicateImages(urls) {
    const seen = new Set();
    const unique = [];
    
    for (const url of urls) {
        // Remove parâmetros de query e fragmentos
        const cleanUrl = url.split('?')[0].split('#')[0];
        
        if (!seen.has(cleanUrl)) {
            seen.add(cleanUrl);
            unique.push(url);
        }
    }
    
    return unique;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productName } = await req.json();
        if (!productName) {
            return Response.json({ error: "Nome do produto obrigatório" }, { status: 400 });
        }

        console.log(`🔍 Buscando: ${productName}`);

        console.log('🤖 Buscando com IA + Internet...');
        
        // 🔥 TENTA ATÉ 3 VEZES COM VALIDAÇÃO RIGOROSA
        let searchResult;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            attempts++;
            console.log(`🔄 Tentativa ${attempts}/${maxAttempts}...`);
            
            searchResult = await base44.integrations.Core.InvokeLLM({
                prompt: `BUSCA RIGOROSA: "${productName}"

REGRAS OBRIGATÓRIAS:
1. Busque APENAS o produto PRINCIPAL "${productName}" - NÃO acessórios
2. REJEITE: carregadores, capas, películas, adaptadores, fones, cabos
3. O título DEVE conter as palavras-chave: "${productName}"
4. Priorize: Mercado Livre, Amazon, Shopee

RETORNE:
- Título completo do produto
- Descrição com especificações
- URL COMPLETA da página

EXEMPLOS VÁLIDOS:
✅ "iPhone 15 Pro 256GB"
✅ "Samsung Galaxy S23 Ultra 512GB"

EXEMPLOS INVÁLIDOS:
❌ "Carregador para iPhone"
❌ "Capa iPhone 15"
❌ "Película iPhone"`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        productPageUrl: { type: "string" }
                    },
                    required: ["title", "description", "productPageUrl"]
                }
            });

            const { title: resultTitle } = searchResult;
            
            if (!resultTitle) {
                console.log(`❌ Tentativa ${attempts}: Sem título retornado`);
                if (attempts < maxAttempts) continue;
                break;
            }
            
            // 🔥 VALIDAÇÃO RIGOROSA
            const lowerTitle = resultTitle.toLowerCase();
            const lowerSearch = productName.toLowerCase();
            
            // Bloqueia acessórios
            const isAccessory = [
                'carregador', 'charger', 'cabo', 'cable', 
                'capa', 'case', 'película', 'protetor',
                'adaptador', 'adapter', 'fone', 'earphone',
                'suporte', 'stand', 'película', 'glass'
            ].some(keyword => lowerTitle.includes(keyword));
            
            if (isAccessory) {
                console.log(`❌ Tentativa ${attempts}: Acessório detectado - "${resultTitle}"`);
                if (attempts < maxAttempts) continue;
            }
            
            // Valida se contém palavras-chave do produto
            const searchWords = lowerSearch.split(' ').filter(w => w.length > 2);
            const matchCount = searchWords.filter(word => lowerTitle.includes(word)).length;
            const matchRatio = matchCount / searchWords.length;
            
            if (matchRatio < 0.5) {
                console.log(`❌ Tentativa ${attempts}: Título não corresponde - "${resultTitle}"`);
                if (attempts < maxAttempts) continue;
            }
            
            console.log(`✅ Validação passou: "${resultTitle}"`);
            break;
        }

        let { title, description, productPageUrl } = searchResult;
        
        console.log(`📦 Título final: ${title}`);
        console.log(`🔗 URL encontrada: ${productPageUrl}`);
        
        if (!title || !productPageUrl || title === 'PRODUTO_NAO_ENCONTRADO') {
            return Response.json({
                error: "Produto não encontrado",
                suggestion: "Tente com marca + modelo (ex: Samsung Galaxy S23)"
            }, { status: 404 });
        }
        
        // AGORA EXTRAI AS IMAGENS DA PÁGINA REAL
        console.log('📸 Extraindo imagens da página...');
        console.log('🔗 URL do produto:', productPageUrl);
        
        let html = '';
        try {
            const resp = await fetch(productPageUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
                },
                signal: AbortSignal.timeout(15000)
            });
            
            if (resp.ok) {
                html = await resp.text();
                console.log(`✅ HTML carregado: ${html.length} chars`);
            } else {
                console.error(`❌ HTTP ${resp.status}: ${resp.statusText}`);
            }
        } catch (e) {
            console.error('❌ Erro ao buscar HTML:', e.message);
        }
        
        let imageUrls = [];
        
        if (!html || html.length < 1000) {
            console.error('❌ HTML vazio ou muito pequeno, impossível extrair imagens');
            return Response.json({
                error: "Não foi possível acessar a página do produto",
                suggestion: "Tente buscar outro produto ou use o importador por URL"
            }, { status: 500 });
        }
        
        const url = productPageUrl.toLowerCase();
        console.log(`🎯 Detectado marketplace: ${url}`);
        
        if (url.includes('mercadolivre') || url.includes('mercadolibre')) {
            console.log('🛒 Processando Mercado Livre...');
            const regex = /https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[A-Za-z0-9_-]+\.(?:jpg|webp)/gi;
            const matches = html.match(regex) || [];
            console.log(`📸 Regex encontrou ${matches.length} matches`);
            imageUrls = [...new Set(matches)]
                .filter(u => !u.includes('-O.jpg') && !u.includes('-I.jpg'));
            console.log(`✅ Após filtro: ${imageUrls.length} imagens`);
                
        } else if (url.includes('amazon')) {
            console.log('🛒 Processando Amazon...');
            const regex = /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_-]+\.(?:jpg|png)/gi;
            const matches = html.match(regex) || [];
            console.log(`📸 Regex encontrou ${matches.length} matches`);
            imageUrls = [...new Set(matches)]
                .filter(u => {
                    const lower = u.toLowerCase();
                    return !lower.includes('_us100_') && 
                           !lower.includes('_sl75_') && 
                           !lower.includes('_ss') &&
                           !lower.includes('_ac_ul');
                });
            console.log(`✅ Após filtro: ${imageUrls.length} imagens`);
                
        } else if (url.includes('shopee')) {
            console.log('🛒 Processando Shopee...');
            const regex = /https:\/\/cf\.shopee\.com\.br\/file\/[A-Za-z0-9_-]+/gi;
            const altRegex = /https:\/\/down-br\.img\.susercontent\.com\/file\/[A-Za-z0-9_-]+/gi;
            const matches1 = html.match(regex) || [];
            const matches2 = html.match(altRegex) || [];
            console.log(`📸 Regex 1: ${matches1.length}, Regex 2: ${matches2.length}`);
            imageUrls = [...new Set([...matches1, ...matches2])];
            console.log(`✅ Total: ${imageUrls.length} imagens`);
            
        } else if (url.includes('magazineluiza') || url.includes('magalu')) {
            console.log('🛒 Processando Magazine Luiza...');
            
            const jsonRegex = /"images":\s*\[(.*?)\]/s;
            const jsonMatch = html.match(jsonRegex);
            
            if (jsonMatch) {
                console.log('📦 Encontrado JSON de imagens no HTML');
                const imageMatches = jsonMatch[1].match(/https:\/\/[^"]+\.(?:jpg|jpeg|png|webp)/gi) || [];
                console.log(`📸 JSON tinha ${imageMatches.length} URLs`);
                imageUrls = [...new Set(imageMatches)];
            }
            
            if (imageUrls.length === 0) {
                console.log('🔄 Tentando regex de produtos...');
                const produtoRegex = /https:\/\/(?:a-static|wx)\.mlcdn\.com\.br\/produtos\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi;
                const matches = html.match(produtoRegex) || [];
                console.log(`📸 Produtos: ${matches.length} matches`);
                imageUrls = [...new Set(matches)];
            }
            
            if (imageUrls.length === 0) {
                console.log('🔄 Fallback amplo com filtro...');
                const allRegex = /https:\/\/[^"'\s<>]+\.mlcdn\.com\.br\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi;
                const allMatches = html.match(allRegex) || [];
                console.log(`📸 Todas URLs: ${allMatches.length}`);
                imageUrls = [...new Set(allMatches)];
            }
            
            const preFilter = imageUrls.filter(u => !u.toLowerCase().includes('az-request'));
            console.log(`🔒 Bloqueou az-request: ${imageUrls.length} → ${preFilter.length}`);
            
            const original = preFilter.length;
            imageUrls = preFilter.filter(u => {
                const lower = u.toLowerCase();
                const blocked = lower.includes('magalu-logo') ||
                       lower.includes('selo') || 
                       lower.includes('/logo') || 
                       lower.includes('banner') ||
                       lower.includes('sprite') ||
                       lower.includes('/icon') ||
                       lower.includes('shared/') ||
                       u.length < 80;
                       
                if (blocked) {
                    console.log(`🚫 Bloqueado: ${u.substring(0, 80)}`);
                }
                return !blocked;
            });
            console.log(`✅ Filtro final: ${original} → ${imageUrls.length} imagens`);
                
        } else if (url.includes('casasbahia')) {
            console.log('🛒 Processando Casas Bahia...');
            const regex = /https:\/\/a-static\.mlcdn\.com\.br\/[^"'\s<>]+\/[0-9]+\/[^"'\s<>]+\.(?:jpg|jpeg|png)/gi;
            const matches = html.match(regex) || [];
            console.log(`📸 Regex encontrou ${matches.length} matches`);
            imageUrls = [...new Set(matches)];
            console.log(`✅ Total: ${imageUrls.length} imagens`);
            
        } else if (url.includes('americanas')) {
            console.log('🛒 Processando Americanas...');
            const regex = /https:\/\/images-americanas\.b2w\.io\/produtos\/[^"'\s<>]+\.(?:jpg|png|webp)/gi;
            const matches = html.match(regex) || [];
            console.log(`📸 Regex encontrou ${matches.length} matches`);
            imageUrls = [...new Set(matches)];
            console.log(`✅ Total: ${imageUrls.length} imagens`);
            
        } else {
            console.log('🛒 Usando fallback genérico...');
            const regex = /https?:\/\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi;
            const matches = html.match(regex) || [];
            console.log(`📸 Regex encontrou ${matches.length} matches`);
            imageUrls = [...new Set(matches)]
                .filter(u => {
                    const lower = u.toLowerCase();
                    return !lower.includes('logo') && 
                           !lower.includes('icon') && 
                           !lower.includes('selo') &&
                           !lower.includes('banner') &&
                           u.length > 60;
                });
            console.log(`✅ Após filtro: ${imageUrls.length} imagens`);
        }
        
        console.log(`📸 Total extraído: ${imageUrls.length} URLs`);

        // 🧹 Limpa URLs
        console.log('🧹 Limpando URLs...');
        const cleanedUrls = imageUrls
            .map(url => url.split('"')[0].split('&quot;')[0].trim())
            .filter(url => url.length > 30)
            .filter((url, index, self) => self.indexOf(url) === index);
        
        console.log(`📦 ${cleanedUrls.length} URLs após limpeza`);
        
        // 🎯 Calcula score de relevância
        console.log('🎯 Calculando relevância...');
        const scoredUrls = cleanedUrls.map(url => ({
            url,
            score: calculateImageScore(url, productName)
        }))
        .filter(item => item.score > -50) // Remove imagens obviamente ruins
        .sort((a, b) => b.score - a.score); // Ordena por score
        
        console.log(`📊 Top 5 scores: ${scoredUrls.slice(0, 5).map(i => `${i.score}`).join(', ')}`);
        
        // 🔍 Valida URLs (prioritárias primeiro)
        console.log(`🔍 Validando ${Math.min(scoredUrls.length, 15)} imagens...`);
        const validatedUrls = [];
        
        for (const { url, score } of scoredUrls.slice(0, 15)) {
            const isValid = await validateImageUrl(url);
            if (isValid) {
                validatedUrls.push(url);
                console.log(`✅ [${validatedUrls.length}] Score ${score}: ${url.substring(0, 60)}...`);
                
                if (validatedUrls.length >= 8) break; // Limita a 8 imagens
            }
        }
        
        // 🧹 Remove duplicatas
        let uniqueUrls = deduplicateImages(validatedUrls);
        console.log(`🧹 Após deduplicação: ${uniqueUrls.length} imagens`);
        
        // 🤖 Valida com IA Vision (primeira imagem apenas - otimização)
        if (uniqueUrls.length > 0) {
            console.log('🤖 Validando primeira imagem com IA Vision...');
            const isValidProduct = await validateImageWithAI(uniqueUrls[0], productName, base44);
            
            if (!isValidProduct) {
                console.log('⚠️ IA detectou que primeira imagem NÃO é do produto! Tentando fallback...');
                uniqueUrls.shift();
            }
        }
        
        console.log(`✅ RESULTADO PARCIAL: ${uniqueUrls.length} imagens validadas`);

        // ⚠️ FALLBACK: Se poucas imagens, tenta outros marketplaces
        if (uniqueUrls.length < 3) {
            console.log('⚠️ Poucas imagens, tentando fallback...');
            
            const triedMarkets = [productPageUrl];
            const marketsToTry = ['mercado livre', 'amazon', 'shopee'];
            
            for (const market of marketsToTry) {
                if (triedMarkets.some(url => url.toLowerCase().includes(market))) {
                    console.log(`⏭️ Já tentou ${market}, pulando...`);
                    continue;
                }
                
                console.log(`🔄 Tentando buscar em ${market}...`);
                
                try {
                    const fallbackResult = await base44.integrations.Core.InvokeLLM({
                        prompt: `Encontre "${productName}" ESPECIFICAMENTE no site: ${market}.
Retorne o título, descrição e URL COMPLETA da página do produto.`,
                        add_context_from_internet: true,
                        response_json_schema: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                description: { type: "string" },
                                productPageUrl: { type: "string" }
                            },
                            required: ["title", "productPageUrl"]
                        }
                    });
                    
                    const fallbackUrl = fallbackResult.productPageUrl;
                    if (!fallbackUrl) continue;
                    
                    triedMarkets.push(fallbackUrl);
                    console.log(`📦 Fallback URL: ${fallbackUrl}`);
                    
                    // Extrai imagens do fallback
                    const fallbackHtml = await fetch(fallbackUrl, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                            "Accept": "text/html,application/xhtml+xml"
                        },
                        signal: AbortSignal.timeout(10000)
                    }).then(r => r.ok ? r.text() : '').catch(() => '');
                    
                    if (!fallbackHtml || fallbackHtml.length < 1000) continue;
                    
                    let fallbackImages = [];
                    const lowerUrl = fallbackUrl.toLowerCase();
                    
                    if (lowerUrl.includes('mercado')) {
                        const regex = /https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[A-Za-z0-9_-]+\.(?:jpg|webp)/gi;
                        fallbackImages = [...new Set(fallbackHtml.match(regex) || [])]
                            .filter(u => !u.includes('-O.jpg'));
                    } else if (lowerUrl.includes('amazon')) {
                        const regex = /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_-]+\.(?:jpg|png)/gi;
                        fallbackImages = [...new Set(fallbackHtml.match(regex) || [])];
                    } else if (lowerUrl.includes('shopee')) {
                        const regex = /https:\/\/cf\.shopee\.com\.br\/file\/[A-Za-z0-9_-]+/gi;
                        fallbackImages = [...new Set(fallbackHtml.match(regex) || [])];
                    }
                    
                    // Calcula score e valida fallback
                    const scoredFallback = fallbackImages.map(url => ({
                        url,
                        score: calculateImageScore(url, productName)
                    }))
                    .filter(item => item.score > -30)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5);
                    
                    for (const { url } of scoredFallback) {
                        if (uniqueUrls.length >= 6) break;
                        if (await validateImageUrl(url)) {
                            uniqueUrls.push(url);
                            console.log(`✅ Fallback ${market}: ${url.substring(0, 60)}`);
                        }
                    }
                    
                    if (uniqueUrls.length >= 3) {
                        console.log(`🎉 Fallback ${market} encontrou imagens!`);
                        productPageUrl = fallbackUrl;
                        title = fallbackResult.title || title;
                        description = fallbackResult.description || description;
                        break;
                    }
                } catch (e) {
                    console.error(`❌ Fallback ${market} falhou:`, e.message);
                }
            }
        }

        // 🎯 Limita a 6 imagens finais
        const finalUrls = deduplicateImages(uniqueUrls).slice(0, 6);
        
        console.log(`🎉 RETORNANDO ${finalUrls.length} IMAGENS VALIDADAS`);

        const detectedMarketplace = 
            productPageUrl.includes('mercadolivre') || productPageUrl.includes('mercadolibre') ? 'Mercado Livre' :
            productPageUrl.includes('amazon') ? 'Amazon' :
            productPageUrl.includes('shopee') ? 'Shopee' :
            productPageUrl.includes('magazineluiza') || productPageUrl.includes('magalu') ? 'Magazine Luiza' :
            productPageUrl.includes('casasbahia') ? 'Casas Bahia' :
            productPageUrl.includes('americanas') ? 'Americanas' : 'Internet';
        
        if (finalUrls.length === 0) {
            return Response.json({
                error: `Produto encontrado mas sem imagens disponíveis`,
                suggestion: "Use o importador por URL ou upload manual de imagens",
                title: title,
                description: description
            }, { status: 404 });
        }
        
        return Response.json({
            title: title.substring(0, 200),
            description: (description || 'Produto encontrado').substring(0, 500),
            imageUrls: finalUrls,
            marketplace: detectedMarketplace,
            sourceUrl: productPageUrl,
            searchTerm: productName
        }, { status: 200 });

    } catch (error) {
        console.error('❌', error);
        return Response.json({
            error: "Erro ao buscar produto",
            details: error.message
        }, { status: 500 });
    }
});