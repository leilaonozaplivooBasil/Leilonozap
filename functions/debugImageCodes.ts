import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function getRandomUA() {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

        console.log(`🔍 ANALISANDO: ${productUrl}`);

        // Baixa HTML
        const fetchResponse = await fetch(productUrl, {
            headers: {
                'User-Agent': getRandomUA(),
                'Accept': 'text/html',
                'Accept-Language': 'pt-BR'
            }
        });

        if (!fetchResponse.ok) {
            return Response.json({ 
                error: `Fetch falhou: ${fetchResponse.status}` 
            }, { status: 500 });
        }

        const html = await fetchResponse.text();
        console.log(`✅ HTML baixado: ${html.length} caracteres`);

        // EXTRAI TODAS AS URLs DO MLSTATIC
        const allImageRegex = /https?:\/\/http2\.mlstatic\.com\/[^"'\s]+?\.(?:webp|jpg|jpeg|png)/gi;
        const allMatches = [...html.matchAll(allImageRegex)];

        console.log(`\n📸 TOTAL DE URLs ENCONTRADAS: ${allMatches.length}\n`);

        // Agrupa por tipo
        const byPattern = {
            'D_NQ_NP_2X': [],
            'D_Q_NP_2X': [],
            'D_NQ_NP': [],
            'outros': []
        };

        allMatches.forEach(match => {
            const url = match[0].split('?')[0];
            
            if (url.includes('D_NQ_NP_2X')) {
                byPattern['D_NQ_NP_2X'].push(url);
            } else if (url.includes('D_Q_NP_2X')) {
                byPattern['D_Q_NP_2X'].push(url);
            } else if (url.includes('D_NQ_NP')) {
                byPattern['D_NQ_NP'].push(url);
            } else {
                byPattern['outros'].push(url);
            }
        });

        // Exibe agrupado
        console.log('🎯 IMAGENS D_NQ_NP_2X (ALTA QUALIDADE):');
        byPattern['D_NQ_NP_2X'].forEach((url, i) => {
            const code = url.match(/2X_(\d+)-/)?.[1] || '?';
            console.log(`  ${i + 1}. [${code}] ${url}`);
        });

        console.log('\n🎯 IMAGENS D_Q_NP_2X:');
        byPattern['D_Q_NP_2X'].forEach((url, i) => {
            const code = url.match(/2X_(\d+)-/)?.[1] || '?';
            console.log(`  ${i + 1}. [${code}] ${url}`);
        });

        console.log('\n🎯 IMAGENS D_NQ_NP:');
        byPattern['D_NQ_NP'].forEach((url, i) => {
            console.log(`  ${i + 1}. ${url}`);
        });

        console.log('\n🎯 OUTROS:');
        byPattern['outros'].slice(0, 10).forEach((url, i) => {
            console.log(`  ${i + 1}. ${url}`);
        });

        // EXTRAI CÓDIGOS ÚNICOS
        const codesSet = new Set();
        allMatches.forEach(match => {
            const url = match[0];
            const codeMatch = url.match(/2X_(\d+)-/);
            if (codeMatch) {
                codesSet.add(codeMatch[1]);
            }
        });

        const uniqueCodes = Array.from(codesSet);
        console.log(`\n🔢 CÓDIGOS ÚNICOS ENCONTRADOS (${uniqueCodes.length}):`);
        console.log(uniqueCodes.join(', '));

        return Response.json({
            success: true,
            total_urls: allMatches.length,
            by_pattern: {
                'D_NQ_NP_2X': byPattern['D_NQ_NP_2X'].length,
                'D_Q_NP_2X': byPattern['D_Q_NP_2X'].length,
                'D_NQ_NP': byPattern['D_NQ_NP'].length,
                'outros': byPattern['outros'].length
            },
            unique_codes: uniqueCodes,
            sample_urls: {
                'D_NQ_NP_2X': byPattern['D_NQ_NP_2X'].slice(0, 6),
                'D_Q_NP_2X': byPattern['D_Q_NP_2X'].slice(0, 6)
            }
        });

    } catch (error) {
        console.error('❌ ERRO:', error);
        return Response.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});