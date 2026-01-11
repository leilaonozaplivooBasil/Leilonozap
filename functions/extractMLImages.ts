import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        await base44.auth.me();
    } catch (authError) {
        return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    let productUrl;
    try {
        const body = await req.json();
        productUrl = body.productUrl;
    } catch (parseError) {
        return Response.json({ error: 'JSON inválido' }, { status: 400 });
    }
    
    if (!productUrl || !productUrl.includes('mercadolivre.com.br')) {
        return Response.json({ 
            error: "URL do Mercado Livre obrigatória",
            found: false 
        }, { status: 400 });
    }

    console.log('🔍 Extraindo imagens do ML:', productUrl);

    try {
        // Busca o HTML da página
        const response = await fetch(productUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html',
            }
        });

        if (!response.ok) {
            return Response.json({
                error: `Erro ao acessar ML: ${response.status}`,
                found: false
            }, { status: 200 });
        }

        const html = await response.text();
        console.log('📄 HTML recebido:', html.length, 'caracteres');

        // 🎯 REGEX PARA EXTRAIR IMAGENS DE ALTA RESOLUÇÃO DO ML
        // Padrão: https://http2.mlstatic.com/D_NQ_NP_XXXXXX-MLAXXXXXXXXXX_XXXXXX-F.webp
        const imageRegex = /https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[0-9]+-(?:MLA|MLU|MLB)[0-9]+_[0-9]+-F\.webp/gi;
        
        let matches = html.match(imageRegex) || [];
        let uniqueImages = [...new Set(matches)];
        
        // Se não encontrou -F, tenta -O
        if (uniqueImages.length === 0) {
            console.log('⚠️ Tentando padrão -O.webp...');
            const fallbackRegex = /https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[0-9]+-(?:MLA|MLU|MLB)[0-9]+_[0-9]+-O\.webp/gi;
            matches = html.match(fallbackRegex) || [];
            uniqueImages = [...new Set(matches)];
        }

        console.log('📸 Imagens encontradas:', uniqueImages.length);

        // Extrai título
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(/ \| Mercado Livre/gi, '').trim() : '';
        
        // Extrai preço
        const priceMatch = html.match(/"price":(\d+(?:\.\d+)?)/);
        const price = priceMatch ? parseFloat(priceMatch[1]) : null;

        // Extrai descrição
        const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
        const description = descMatch ? descMatch[1] : title;

        if (uniqueImages.length === 0) {
            return Response.json({
                error: "Nenhuma imagem encontrada neste anúncio",
                found: false
            }, { status: 200 });
        }

        return Response.json({
            found: true,
            images: uniqueImages,
            title,
            price,
            description,
            source: 'Mercado Livre'
        }, { status: 200 });

    } catch (error) {
        console.error('❌ Erro:', error.message);
        return Response.json({
            error: error.message,
            found: false
        }, { status: 200 });
    }
});