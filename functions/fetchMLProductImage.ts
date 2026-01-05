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

        // ETAPA 1: Usar IA para acessar página RENDERIZADA (com JavaScript)
        console.log('🤖 ETAPA 1: Usando IA para acessar página renderizada...');
        
        const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `ACESSE: ${productUrl}

🎯 OBJETIVO: Extrair a URL da IMAGEM PRINCIPAL do produto

⚠️ INSTRUÇÕES:
- A página carrega imagens via JavaScript
- Procure no HTML renderizado por URLs de imagens que contenham "mlstatic.com"
- Copie a URL COMPLETA da primeira imagem de produto (alta resolução)
- Formato esperado: https://http2.mlstatic.com/D_NQ_NP_CODIGO.jpg

RETORNE apenas a URL da imagem principal.`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    image_url: { type: "string" }
                },
                required: ["image_url"]
            }
        });

        const imageUrl = aiResult?.image_url;
        
        if (!imageUrl || !imageUrl.startsWith('http')) {
            console.error('❌ IA não retornou URL válida:', aiResult);
            return Response.json({ 
                success: false, 
                error: "URL da imagem não encontrada"
            }, { status: 404 });
        }

        console.log(`🎯 URL extraída pela IA: ${imageUrl}`);

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