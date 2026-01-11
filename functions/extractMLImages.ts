import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productUrl } = await req.json();
        
        if (!productUrl || !productUrl.includes('mercadolivre.com.br')) {
            return Response.json({ 
                error: "URL do Mercado Livre obrigatória" 
            }, { status: 400 });
        }

        console.log('🔍 Extraindo imagens do ML:', productUrl);

        // Busca o HTML da página
        const response = await fetch(productUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            }
        });

        if (!response.ok) {
            throw new Error(`Erro ao acessar ML: ${response.status}`);
        }

        const html = await response.text();
        console.log('📄 HTML recebido:', html.length, 'caracteres');

        // 🎯 REGEX PARA EXTRAIR IMAGENS DE ALTA RESOLUÇÃO DO ML
        // Padrão: https://http2.mlstatic.com/D_NQ_NP_XXXXXX-MLAXXXXXXXXXX_XXXXXX-F.webp (alta resolução)
        // Ou: https://http2.mlstatic.com/D_NQ_NP_XXXXXX-MLUXXXXXXXXXX_XXXXXX-F.webp
        const imageRegex = /https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[0-9]+-(?:MLA|MLU|MLB)[0-9]+_[0-9]+-F\.webp/gi;
        
        const matches = html.match(imageRegex) || [];
        
        // Remove duplicatas
        const uniqueImages = [...new Set(matches)];
        
        console.log('📸 Imagens encontradas:', uniqueImages.length);
        uniqueImages.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));

        // Extrai título da página
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        let title = titleMatch ? titleMatch[1].replace(' | MercadoLivre', '').replace(' | Mercado Livre', '').trim() : '';
        
        // Extrai preço
        const priceMatch = html.match(/\"price\":(\d+(?:\.\d+)?)/);
        const price = priceMatch ? parseFloat(priceMatch[1]) : null;

        // Extrai descrição
        const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
        const description = descMatch ? descMatch[1] : title;

        if (uniqueImages.length === 0) {
            console.log('⚠️ Nenhuma imagem -F.webp encontrada, tentando padrão -O.webp...');
            
            // Fallback: tenta padrão -O.webp (resolução média)
            const fallbackRegex = /https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[0-9]+-(?:MLA|MLU|MLB)[0-9]+_[0-9]+-O\.webp/gi;
            const fallbackMatches = html.match(fallbackRegex) || [];
            const fallbackUnique = [...new Set(fallbackMatches)];
            
            if (fallbackUnique.length > 0) {
                console.log('✅ Encontradas', fallbackUnique.length, 'imagens -O.webp');
                return Response.json({
                    found: true,
                    images: fallbackUnique,
                    title,
                    price,
                    description,
                    source: 'Mercado Livre'
                }, { status: 200 });
            }

            return Response.json({
                error: "Nenhuma imagem encontrada neste anúncio",
                found: false
            }, { status: 404 });
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
        }, { status: 500 });
    }
});