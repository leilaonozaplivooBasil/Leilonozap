import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productUrl } = await req.json();
        
        console.log(`🔍 Baixando: ${productUrl}`);

        const response = await fetch(productUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html',
                'Accept-Language': 'pt-BR'
            }
        });

        const html = await response.text();
        console.log(`✅ HTML baixado: ${html.length} chars`);

        // BUSCA TODAS AS URLS DE IMAGEM DO MLSTATIC
        const regex = /https?:\/\/http2\.mlstatic\.com\/[^\s"'<>]+/g;
        const matches = [...html.matchAll(regex)];

        console.log(`\n📸 TOTAL: ${matches.length} URLs\n`);

        // Mostra as primeiras 20
        matches.slice(0, 20).forEach((m, i) => {
            console.log(`${i + 1}. ${m[0]}`);
        });

        // Filtra apenas imagens de produto (com D_NQ ou D_Q)
        const productImages = matches
            .map(m => m[0])
            .filter(url => url.includes('/D_'))
            .filter(url => !url.includes('.woff') && !url.includes('.ttf'));

        console.log(`\n🎯 IMAGENS DE PRODUTO (${productImages.length}):\n`);
        productImages.forEach((url, i) => {
            console.log(`${i + 1}. ${url}`);
        });

        return Response.json({
            success: true,
            total_urls: matches.length,
            product_images: productImages.slice(0, 10)
        });

    } catch (error) {
        console.error('❌', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});