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
        
        const searchResult = await base44.integrations.Core.InvokeLLM({
            prompt: `BUSCA DE PRODUTO: "${productName}"

TAREFA:
1. Encontre uma página de produto que vende "${productName}" (Mercado Livre, Amazon, Magazine Luiza, etc)
2. Retorne:
   - Nome completo do produto
   - Descrição com especificações (3-5 linhas)
   - URL COMPLETA da página do produto (obrigatório)

IMPORTANTE: A URL deve ser de uma página REAL que existe.`,
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

        let { title, description, productPageUrl } = searchResult;
        
        console.log(`📦 Título: ${title}`);
        console.log(`🔗 URL encontrada: ${productPageUrl}`);
        
        if (!title || !productPageUrl || title === 'PRODUTO_NAO_ENCONTRADO') {
            return Response.json({
                error: "Produto não encontrado",
                suggestion: "Tente com marca + modelo (ex: Samsung Galaxy S23)"
            }, { status: 404 });
        }
        
        // AGORA EXTRAI AS IMAGENS DA PÁGINA REAL
        console.log('📸 Extraindo imagens da página...');
        
        let html = '';
        try {
            const resp = await fetch(productPageUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml"
                },
                signal: AbortSignal.timeout(15000)
            });
            
            if (resp.ok) {
                html = await resp.text();
                console.log(`✅ HTML carregado: ${html.length} chars`);
            }
        } catch (e) {
            console.error('❌ Erro ao buscar HTML:', e.message);
        }
        
        let imageUrls = [];
        
        if (html) {
            const url = productPageUrl.toLowerCase();
            
            if (url.includes('mercadolivre')) {
                const regex = /https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[^"'\s<>]+\.(?:jpg|webp)/gi;
                imageUrls = [...new Set(html.match(regex) || [])];
            } else if (url.includes('amazon')) {
                const regex = /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_-]+\.jpg/gi;
                imageUrls = [...new Set(html.match(regex) || [])]
                    .filter(u => !u.includes('_US100_') && !u.includes('_SL75_'));
            } else if (url.includes('shopee')) {
                const regex = /https:\/\/[^"'\s<>]*shopee\.com\.br\/[^"'\s<>]+\.(?:jpg|png|webp)/gi;
                imageUrls = [...new Set(html.match(regex) || [])];
            } else {
                const regex = /https?:\/\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi;
                imageUrls = [...new Set(html.match(regex) || [])]
                    .filter(u => {
                        const l = u.toLowerCase();
                        return !l.includes('logo') && !l.includes('icon') && u.length > 50;
                    });
            }
            
            imageUrls = imageUrls.slice(0, 10);
        }

        console.log(`🖼️ Imagens extraídas do HTML: ${imageUrls.length}`);
        
        // Limpa e valida URLs
        imageUrls = imageUrls
            .map(url => url.split('"')[0].split('&quot;')[0].split('?')[0])
            .filter(url => url.length > 30)
            .filter((url, index, self) => self.indexOf(url) === index)
            .slice(0, 10);

        console.log(`🔍 Validando ${imageUrls.length} imagens...`);
        
        // 🔥 VALIDA CADA IMAGEM ANTES DE RETORNAR
        const validatedUrls = [];
        for (const url of imageUrls) {
            const isValid = await validateImageUrl(url);
            if (isValid) {
                validatedUrls.push(url);
                console.log(`✅ OK: ${url.substring(0, 60)}`);
            } else {
                console.log(`❌ FALHOU: ${url.substring(0, 60)}`);
            }
            if (validatedUrls.length >= 8) break;
        }

        console.log(`✅ ${validatedUrls.length} imagens validadas`);

        return Response.json({
            title: title.substring(0, 200),
            description: (description || 'Produto encontrado').substring(0, 500),
            imageUrls: validatedUrls,
            marketplace: productPageUrl.includes('mercadolivre') ? 'Mercado Livre' :
                        productPageUrl.includes('amazon') ? 'Amazon' :
                        productPageUrl.includes('shopee') ? 'Shopee' :
                        productPageUrl.includes('magazineluiza') ? 'Magazine Luiza' : 'Internet',
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