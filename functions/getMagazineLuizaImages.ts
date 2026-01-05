import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ error: "URL obrigatória" }, { status: 400 });
        }

        console.log(`🔍 Magazine Luiza: ${productUrl}`);

        const response = await fetch(productUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html',
                'Accept-Language': 'pt-BR'
            }
        });

        const html = await response.text();
        console.log(`✅ HTML baixado: ${html.length} chars`);

        // BUSCA TODAS AS URLs QUE TERMINAM COM .jpg ou .jpeg (REGEX MAIS FLEXÍVEL)
        const regex = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg)/gi;
        const allMatches = [...html.matchAll(regex)];

        console.log(`\n📸 TOTAL DE URLs .jpg/.jpeg: ${allMatches.length}\n`);
        
        // MOSTRA PRIMEIRAS 20 PARA DEBUG
        allMatches.slice(0, 20).forEach((m, i) => {
            console.log(`  ${i + 1}. ${m[0]}`);
        });

        // FILTRA APENAS DO MLCDN (imagens de produto do Magazine Luiza)
        const productImages = allMatches
            .map(m => m[0].split('?')[0].split('"')[0].split("'")[0]) // Limpa tudo
            .filter(url => url.includes('mlcdn.com.br') || url.includes('magazineluiza.com.br'))
            .filter(url => !url.includes('logo') && !url.includes('icon') && !url.includes('sprite'));

        // REMOVE DUPLICATAS
        const uniqueImages = [...new Set(productImages)];

        console.log(`🎯 IMAGENS DO PRODUTO (${uniqueImages.length}):\n`);
        uniqueImages.forEach((url, i) => {
            console.log(`  ${i + 1}. ${url}`);
        });

        return Response.json({
            success: true,
            image_urls: uniqueImages,
            total: uniqueImages.length
        });

    } catch (error) {
        console.error('❌ ERRO:', error);
        return Response.json({
            error: error.message
        }, { status: 500 });
    }
});