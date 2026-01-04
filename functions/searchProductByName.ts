import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// 🔥 VALIDA SE IMAGEM CARREGA REALMENTE
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
            
            // ESTRATÉGIA 1: Buscar dentro de JSON embutido (dados estruturados)
            const jsonRegex = /"images":\s*\[(.*?)\]/s;
            const jsonMatch = html.match(jsonRegex);
            
            if (jsonMatch) {
                console.log('📦 Encontrado JSON de imagens no HTML');
                const imageMatches = jsonMatch[1].match(/https:\/\/[^"]+\.(?:jpg|jpeg|png|webp)/gi) || [];
                console.log(`📸 JSON tinha ${imageMatches.length} URLs`);
                imageUrls = [...new Set(imageMatches)];
            }
            
            // ESTRATÉGIA 2: Se não achou JSON, busca por padrões de URL
            if (imageUrls.length === 0) {
                console.log('🔄 Tentando regex de produtos...');
                const produtoRegex = /https:\/\/(?:a-static|wx)\.mlcdn\.com\.br\/produtos\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi;
                const matches = html.match(produtoRegex) || [];
                console.log(`📸 Produtos: ${matches.length} matches`);
                imageUrls = [...new Set(matches)];
            }
            
            // ESTRATÉGIA 3: Fallback amplo com filtro pesado
            if (imageUrls.length === 0) {
                console.log('🔄 Fallback amplo com filtro...');
                const allRegex = /https:\/\/[^"'\s<>]+\.mlcdn\.com\.br\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi;
                const allMatches = html.match(allRegex) || [];
                console.log(`📸 Todas URLs: ${allMatches.length}`);
                imageUrls = [...new Set(allMatches)];
            }
            
            // Filtro ULTRA rigoroso - BLOQUEIA az-request primeiro
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
        imageUrls = imageUrls.slice(0, 15);

        // Limpa URLs
        console.log('🧹 Limpando URLs...');
        const cleanedUrls = imageUrls
            .map(url => url.split('"')[0].split('&quot;')[0].trim())
            .filter(url => url.length > 30)
            .filter((url, index, self) => self.indexOf(url) === index);
        
        console.log(`📦 ${cleanedUrls.length} URLs após limpeza`);
        
        if (cleanedUrls.length === 0) {
            console.error('❌ NENHUMA URL após limpeza!');
            // Tenta fallback: buscar qualquer imagem no HTML
            console.log('🔄 Tentando fallback genérico...');
            const fallbackRegex = /https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)/gi;
            const fallbackMatches = html.match(fallbackRegex) || [];
            console.log(`🔄 Fallback encontrou ${fallbackMatches.length} imagens`);
            
            if (fallbackMatches.length > 0) {
                cleanedUrls.push(...fallbackMatches.slice(0, 10));
            }
        }

        console.log(`🔍 Validando ${cleanedUrls.length} imagens...`);
        
        // 🔥 VALIDA CADA IMAGEM
        const validatedUrls = [];
        const failedUrls = [];
        
        for (let i = 0; i < cleanedUrls.length && validatedUrls.length < 8; i++) {
            const url = cleanedUrls[i];
            const isValid = await validateImageUrl(url);
            
            if (isValid) {
                validatedUrls.push(url);
                console.log(`✅ [${i+1}/${cleanedUrls.length}] OK: ${url.substring(0, 70)}`);
            } else {
                failedUrls.push(url);
                console.log(`❌ [${i+1}/${cleanedUrls.length}] FALHOU: ${url.substring(0, 70)}`);
            }
        }

        console.log(`✅ RESULTADO: ${validatedUrls.length} validadas, ${failedUrls.length} falharam`);

        // 🔥 FALLBACK AUTOMÁTICO: Se < 2 imagens, tenta outros marketplaces
        if (validatedUrls.length < 2) {
            console.log('⚠️ Poucas imagens encontradas, tentando fallback...');
            
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
                    
                    // Valida imagens do fallback
                    for (const img of fallbackImages.slice(0, 8)) {
                        if (validatedUrls.length >= 6) break;
                        if (await validateImageUrl(img)) {
                            validatedUrls.push(img);
                            console.log(`✅ Fallback ${market}: ${img.substring(0, 60)}`);
                        }
                    }
                    
                    if (validatedUrls.length >= 2) {
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

        const detectedMarketplace = 
            productPageUrl.includes('mercadolivre') || productPageUrl.includes('mercadolibre') ? 'Mercado Livre' :
            productPageUrl.includes('amazon') ? 'Amazon' :
            productPageUrl.includes('shopee') ? 'Shopee' :
            productPageUrl.includes('magazineluiza') || productPageUrl.includes('magalu') ? 'Magazine Luiza' :
            productPageUrl.includes('casasbahia') ? 'Casas Bahia' :
            productPageUrl.includes('americanas') ? 'Americanas' : 'Internet';
        
        if (validatedUrls.length === 0) {
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
            imageUrls: validatedUrls,
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