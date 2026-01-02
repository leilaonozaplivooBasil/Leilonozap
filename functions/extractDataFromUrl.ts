import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// --- Funções Auxiliares ---
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"
];

const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

function normalizeUrl(url) {
    if (!url) return url;
    return url.replace(/^http:\/\//i, "https://")
              .split("?")[0]
              .replace(/-\w\.(jpg|jpeg|png|webp)$/i, "-F.$1");
}

function deduplicate(arr) {
    const seen = new Set();
    return arr.filter(item => {
        const k = item.url;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

function scoreUrl(url) {
    const lowerUrl = url.toLowerCase();
    let score = 0;

    // --- POSITIVE SIGNALS (More likely to be a product image) ---
    if (/\/d_nq_np_/.test(lowerUrl)) score += 150; // ML High Quality
    if (/-f\.(jpg|jpeg|png|webp)$/.test(lowerUrl)) score += 100; // ML Full size
    if (lowerUrl.includes('/products/')) score += 80;
    if (lowerUrl.includes('/media/')) score += 50;
    if (lowerUrl.includes('uploads')) score += 30;
    if ((lowerUrl.match(/\d/g) || []).length > 8) score += 20; // Lots of numbers = likely an ID
    if (/\.(jpg|jpeg|png|webp)/.test(lowerUrl)) score += 10; // Basic check

    // --- NEGATIVE SIGNALS (More likely to be UI/junk) ---
    // Keywords
    const junkKeywords = ['logo', 'sprite', 'icon', 'avatar', 'placeholder', 'banner', 'cover', 'header', 'footer', 'ui-', 'ad-', 'advert', 'background', 'pattern'];
    for (const keyword of junkKeywords) {
        if (lowerUrl.includes(keyword)) score -= 500;
    }
    // Specific to this case
    if (lowerUrl.includes('leilao-no-zap')) score -= 1000;
    
    // Structure
    if (lowerUrl.endsWith('.svg')) score -= 200;
    if (lowerUrl.endsWith('.gif')) score -= 100;
    if (url.length < 60) score -= 50; // Penalize short URLs
    
    // Dimensions in URL
    const sizeMatch = lowerUrl.match(/_(\d+)x(\d+)/) || lowerUrl.match(/-(\d+)x(\d+)/);
    if (sizeMatch) {
        const width = parseInt(sizeMatch[1], 10);
        const height = parseInt(sizeMatch[2], 10);
        if (width < 200 || height < 200) score -= 400; // Penalize small thumbnails heavily
    }
    
    // Domain specific
    if (lowerUrl.includes('frontend-assets')) score -= 500;
    if (lowerUrl.includes('ui-navigation')) score -= 500;
    
    return score;
}

// Função para decodificar entidades HTML (ex: &amp; -> &)
function decodeHtmlEntities(text) {
    if (!text) return "";
    return text.replace(/&quot;/g, '"')
               .replace(/&apos;/g, "'")
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&amp;/g, '&');
}


Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { productUrl } = await req.json();
        if (!productUrl) {
            return new Response(JSON.stringify({ error: "URL do produto é obrigatória" }), { status: 400 });
        }

        let html = null;
        let lastError = null;
        
        // MÉTODO 1: Fetch direto com User-Agent
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const resp = await fetch(productUrl, { 
                    headers: { 
                        "User-Agent": getRandomUA(),
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
                        "Cache-Control": "no-cache",
                        "Pragma": "no-cache"
                    },
                    redirect: 'follow'
                });
                
                if (resp.ok) {
                    html = await resp.text();
                    console.log("✅ HTML obtido via fetch direto");
                    break;
                }
                
                lastError = `HTTP ${resp.status}`;
            } catch (fetchError) {
                lastError = fetchError.message;
            }
        }
        
        // MÉTODO 2: Se fetch falhou, retorna erro claro para o usuário
        if (!html) {
            console.warn(`⚠️ Não foi possível acessar ${productUrl}. Erro: ${lastError}`);
            
            return new Response(JSON.stringify({ 
                error: "Site bloqueou acesso automático",
                suggestion: "Por favor, copie manualmente as informações do produto",
                details: `Erro: ${lastError}`,
                fallbackAvailable: true
            }), { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 1. EXTRAIR TÍTULO
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        const title = decodeHtmlEntities(titleMatch ? titleMatch[1] : 'Título não encontrado').split('|')[0].trim();

        // 2. EXTRAIR DESCRIÇÃO
        const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
        let description = decodeHtmlEntities(descMatch ? descMatch[1] : '');
        // Se a descrição for muito curta, tenta pegar do og:description
        if (description.length < 50) {
            const ogDescMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
            if (ogDescMatch && ogDescMatch[1].length > description.length) {
                description = decodeHtmlEntities(ogDescMatch[1]);
            }
        }
        if (!description) {
            description = "Descrição não encontrada.";
        }

        // 3. EXTRAIR IMAGENS (lógica mantida)
        const regex = /https?:\/\/[^"'\\\s<>()]+/gi;
        const allUrls = html.match(regex) || [];
        const scoredUrls = allUrls
            .filter(url => /mlstatic\.com/i.test(url) || /\.(jpg|jpeg|png|webp)/.test(url))
            .map(url => ({
                url: normalizeUrl(url),
                score: scoreUrl(url)
            }))
            .filter(item => item.score > 0);

        const uniqueScoredUrls = deduplicate(scoredUrls);
        uniqueScoredUrls.sort((a, b) => b.score - a.score);
        const imageUrls = uniqueScoredUrls.slice(0, 6).map(item => item.url);
        
        return new Response(JSON.stringify({ title, description, imageUrls }), {
             headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ Erro na função extractDataFromUrl:', error);
        return new Response(JSON.stringify({ 
            error: "Erro ao processar URL",
            suggestion: "Tente novamente ou insira os dados manualmente",
            details: error.message 
        }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});