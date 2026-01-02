import { encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

// 🔄 RETRY COM BACKOFF EXPONENCIAL
async function fetchWithRetry(url, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Tentativa ${attempt}/${maxRetries} para: ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Referer': 'https://www.google.com/',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                signal: AbortSignal.timeout(15000) // 15s timeout
            });

            if (response.ok) {
                return response;
            }
            
            // Se for 4xx (erro do cliente), não adianta retry
            if (response.status >= 400 && response.status < 500) {
                throw new Error(`Imagem não encontrada ou acesso negado: ${response.status}`);
            }
            
            lastError = new Error(`Servidor retornou: ${response.status} ${response.statusText}`);
            
        } catch (error) {
            lastError = error;
            console.error(`❌ Tentativa ${attempt} falhou:`, error.message);
        }
        
        // Aguarda antes da próxima tentativa (backoff exponencial)
        if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5s
            console.log(`⏸️ Aguardando ${delay}ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

Deno.serve(async (req) => {
    let imageUrl = '';

    try {
        const payload = await req.json();
        imageUrl = payload.imageUrl;

        if (!imageUrl) {
            return new Response(JSON.stringify({ 
                error: 'URL da imagem é obrigatória' 
            }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
        
        console.log(`📥 Baixando imagem: ${imageUrl}`);
        
        // 🔄 TENTA BAIXAR COM RETRY
        const response = await fetchWithRetry(imageUrl, 3);
        
        const imageBlob = await response.blob();
        
        if (imageBlob.size === 0) {
            throw new Error('A imagem baixada está vazia.');
        }

        const arrayBuffer = await imageBlob.arrayBuffer();
        const base64 = encode(new Uint8Array(arrayBuffer));
        const dataUrl = `data:${imageBlob.type};base64,${base64}`;

        console.log(`✅ Imagem baixada com sucesso! Tamanho: ${imageBlob.size} bytes`);

        return new Response(JSON.stringify({ 
            dataUrl,
            success: true,
            size: imageBlob.size
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('❌ Erro ao baixar imagem:', error.message, 'URL:', imageUrl);
        
        // 🔄 RETORNA URL ORIGINAL COMO FALLBACK (não quebra o fluxo!)
        return new Response(JSON.stringify({ 
            error: error.message,
            originalUrl: imageUrl,
            fallbackUrl: imageUrl, // 🆕 Permite usar URL original
            success: false
        }), { 
            status: 200, // ⚠️ 200 para não quebrar o fluxo do frontend
            headers: { 'Content-Type': 'application/json' }
        });
    }
});