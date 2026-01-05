import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// User agents realistas
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

function getRandomUA() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Função para fazer fetch com retry
async function fetchWithRetry(url, options, maxRetries = 3) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(15000) // 15s timeout
            });
            
            if (response.ok) {
                return response;
            }
            
            // Se for 429 (rate limit), espera antes de tentar novamente
            if (response.status === 429) {
                await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
                continue;
            }
            
            // Outros erros HTTP
            if (response.status === 403 || response.status === 404) {
                throw new Error(`HTTP ${response.status}`);
            }
            
        } catch (error) {
            lastError = error;
            console.warn(`⚠️ Tentativa ${i + 1}/${maxRetries} falhou:`, error.message);
            
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }
    
    throw lastError || new Error('Fetch falhou após todas as tentativas');
}

// Converte ArrayBuffer para Base64
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ 
                success: false, 
                error: "URL do produto obrigatória" 
            }, { status: 400 });
        }

        console.log(`🔍 Buscando imagem de: ${productUrl}`);

        // ETAPA 1: Buscar HTML da página
        console.log('📥 ETAPA 1: Baixando HTML...');
        
        const pageResponse = await fetchWithRetry(productUrl, {
            headers: {
                'User-Agent': getRandomUA(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0'
            }
        });

        const html = await pageResponse.text();
        console.log(`✅ HTML baixado: ${html.length} chars`);

        // ETAPA 2: Extrair URLs de imagens de alta qualidade
        console.log('🖼️ ETAPA 2: Extraindo URLs de imagens...');
        
        // Tenta vários padrões do Mercado Livre
        const patterns = [
            /https?:\/\/http2\.mlstatic\.com\/D_[NQ]+_NP_2X_\d+-[A-Z0-9_-]+\.(?:webp|jpg|jpeg)/gi,
            /https?:\/\/http2\.mlstatic\.com\/D_[NQ]+_NP_\d+-[A-Z0-9_-]+\.(?:webp|jpg|jpeg)/gi,
            /https?:\/\/[^"'\s]+mlstatic\.com[^"'\s]+\.(?:jpg|jpeg|webp)/gi
        ];
        
        let imageUrl = null;
        
        for (const pattern of patterns) {
            const matches = [...html.matchAll(pattern)];
            if (matches.length > 0) {
                imageUrl = matches[0][0].split('?')[0];
                console.log(`✅ Encontrado com padrão: ${pattern.source}`);
                break;
            }
        }
        
        if (!imageUrl) {
            // DEBUG: Mostra trechos do HTML que contêm "mlstatic"
            const mlstaticLines = html.split('\n').filter(line => line.includes('mlstatic')).slice(0, 5);
            console.warn('⚠️ Nenhuma imagem encontrada. Exemplos do HTML:');
            mlstaticLines.forEach(line => console.log(line.substring(0, 200)));
            
            return Response.json({ 
                success: false, 
                error: "Nenhuma imagem de produto encontrada"
            }, { status: 404 });
        }

        console.log(`🎯 URL da imagem principal: ${imageUrl}`);

        // ETAPA 3: Baixar a imagem
        console.log('⬇️ ETAPA 3: Baixando imagem...');
        
        const imageResponse = await fetchWithRetry(imageUrl, {
            headers: {
                'User-Agent': getRandomUA(),
                'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Referer': productUrl, // Importante: informa de onde veio
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Sec-Fetch-Dest': 'image',
                'Sec-Fetch-Mode': 'no-cors',
                'Sec-Fetch-Site': 'cross-site'
            }
        });

        const imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        
        console.log(`✅ Imagem baixada: ${imageBuffer.byteLength} bytes (${contentType})`);

        // ETAPA 4: Converter para Base64
        console.log('🔄 ETAPA 4: Convertendo para Base64...');
        
        const base64Image = arrayBufferToBase64(imageBuffer);
        const imageBase64 = `data:${contentType};base64,${base64Image}`;
        
        console.log(`✅ Base64 gerado: ${imageBase64.length} chars`);

        return Response.json({
            success: true,
            imageBase64: imageBase64,
            metadata: {
                contentType: contentType,
                size: imageBuffer.byteLength,
                originalUrl: imageUrl
            }
        });

    } catch (error) {
        console.error('❌ ERRO:', error);
        
        return Response.json({
            success: false,
            error: error.message || "Erro ao processar imagem",
            details: error.stack
        }, { status: 500 });
    }
});