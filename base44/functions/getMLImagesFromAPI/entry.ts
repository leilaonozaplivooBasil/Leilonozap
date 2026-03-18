import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ error: "URL obrigatória" }, { status: 400 });
        }

        console.log(`🔍 URL: ${productUrl}`);

        // Extrai o MLB ID da URL
        const mlbMatch = productUrl.match(/MLB\d+/);
        if (!mlbMatch) {
            return Response.json({ error: "MLB ID não encontrado na URL" }, { status: 400 });
        }

        const mlbId = mlbMatch[0];
        console.log(`📦 MLB ID: ${mlbId}`);

        // Chama a API oficial do Mercado Livre
        const apiUrl = `https://api.mercadolibre.com/items/${mlbId}`;
        console.log(`🌐 Chamando API: ${apiUrl}`);

        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            return Response.json({ 
                error: `API retornou ${response.status}` 
            }, { status: 500 });
        }

        const data = await response.json();

        console.log(`\n📸 IMAGENS ENCONTRADAS (${data.pictures?.length || 0}):\n`);

        const imageUrls = [];

        if (data.pictures && data.pictures.length > 0) {
            data.pictures.forEach((pic, i) => {
                const url = pic.secure_url || pic.url;
                console.log(`  ${i + 1}. ${url}`);
                imageUrls.push(url);
            });
        }

        console.log(`\n✅ TOTAL: ${imageUrls.length} imagens`);

        return Response.json({
            success: true,
            mlb_id: mlbId,
            title: data.title,
            price: data.price,
            images: imageUrls,
            total_images: imageUrls.length
        });

    } catch (error) {
        console.error('❌ ERRO:', error);
        return Response.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});