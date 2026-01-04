import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

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
        if (seen.has(k)) {
            return false;
        } else {
            seen.add(k);
            return true;
        }
    });
}

function scoreUrl(url) {
    const lowerUrl = url.toLowerCase();
    let score = 0;
    if (/\/d_nq_np_/.test(lowerUrl)) score += 100;
    if (/-ml[b|u]\d+/.test(lowerUrl)) score += 50;
    if (/-f\.(jpg|jpeg|png|webp)$/.test(lowerUrl)) score += 20;
    if (/\.(jpg|jpeg|png|webp)$/.test(lowerUrl)) score += 10;
    if ((lowerUrl.match(/\d/g) || []).length > 5) score += 10;
    if (lowerUrl.includes('logo')) score -= 500;
    if (lowerUrl.includes('sprite')) score -= 500;
    if (lowerUrl.includes('icon')) score -= 500;
    if (lowerUrl.includes('avatar')) score -= 500;
    if (lowerUrl.includes('placeholder')) score -= 500;
    if (lowerUrl.includes('banner')) score -= 200;
    if (lowerUrl.includes('ui-navigation')) score -= 500;
    if (lowerUrl.includes('frontend-assets')) score -= 500;
    if (lowerUrl.endsWith('.svg')) score -= 200;
    const sizeMatch = lowerUrl.match(/_(\d+)x(\d+)/);
    if (sizeMatch) {
        const width = parseInt(sizeMatch[1], 10);
        if (width < 100) score -= 300;
    }
    if (url.length < 50) score -= 100;
    return score;
}

Deno.serve(async (req) => {
    try {
        const { productUrl } = await req.json();
        if (!productUrl) {
            return Response.json({ error: "productUrl é obrigatório" }, { status: 400 });
        }
        
        console.log('🔍 Buscando imagens de:', productUrl);
        
        const resp = await fetch(productUrl, { headers: { "User-Agent": UA } });
        if (!resp.ok) {
            throw new Error(`Falha ao buscar a página: ${resp.status}`);
        }
        const html = await resp.text();
        
        // EXTRAI TODAS AS URLs DA PÁGINA
        const regex = /https?:\/\/[^"'\\\s<>()]+/gi;
        const allUrls = html.match(regex) || [];
        
        console.log(`📋 Total de URLs encontradas: ${allUrls.length}`);
        
        // FILTROS INTELIGENTES POR SITE
        let imageUrls = [];
        
        // MERCADO LIVRE
        if (productUrl.includes('mercadolivre.com') || productUrl.includes('mercadolibre.com')) {
            imageUrls = allUrls.filter(url => 
                /mlstatic\.com/i.test(url) && 
                /\.(jpg|jpeg|png|webp)$/i.test(url)
            );
        }
        // AMAZON
        else if (productUrl.includes('amazon.com')) {
            imageUrls = allUrls.filter(url => 
                /images-amazon\.com|media-amazon\.com|m\.media-amazon\.com/i.test(url) && 
                /\.(jpg|jpeg|png|webp)$/i.test(url)
            );
        }
        // SHOPEE
        else if (productUrl.includes('shopee.com')) {
            imageUrls = allUrls.filter(url => 
                /shopee\.com\.br.*\.(jpg|jpeg|png|webp)$/i.test(url)
            );
        }
        // MAGAZINE LUIZA
        else if (productUrl.includes('magazineluiza.com')) {
            imageUrls = allUrls.filter(url => 
                /magazineluiza\.com\.br.*\.(jpg|jpeg|png|webp)$/i.test(url)
            );
        }
        // CASAS BAHIA / PONTO FRIO
        else if (productUrl.includes('casasbahia.com') || productUrl.includes('pontofrio.com')) {
            imageUrls = allUrls.filter(url => 
                /casasbahia\.com\.br.*\.(jpg|jpeg|png|webp)$|pontofrio\.com\.br.*\.(jpg|jpeg|png|webp)$/i.test(url)
            );
        }
        // CARREFOUR
        else if (productUrl.includes('carrefour.com')) {
            imageUrls = allUrls.filter(url => 
                /carrefour\.com\.br.*\.(jpg|jpeg|png|webp)$/i.test(url)
            );
        }
        // ALIEXPRESS
        else if (productUrl.includes('aliexpress.com')) {
            imageUrls = allUrls.filter(url => 
                /alicdn\.com/i.test(url) && 
                /\.(jpg|jpeg|png|webp)$/i.test(url)
            );
        }
        // GENÉRICO - QUALQUER SITE
        else {
            imageUrls = allUrls.filter(url => /\.(jpg|jpeg|png|webp)$/i.test(url));
        }
        
        console.log(`🖼️ URLs de imagens filtradas: ${imageUrls.length}`);
        
        // SCORE E DEDUPLICA
        const scoredUrls = imageUrls
            .map(url => ({
                url: normalizeUrl(url),
                score: scoreUrl(url)
            }))
            .filter(item => item.score > 0);
            
        const uniqueScoredUrls = deduplicate(scoredUrls);
        uniqueScoredUrls.sort((a, b) => b.score - a.score);
        
        const finalUrls = uniqueScoredUrls.slice(0, 6).map(item => item.url);
        
        console.log(`✅ Top 6 URLs selecionadas:`, finalUrls);
        
        return Response.json({ imageUrls: finalUrls });
    } catch (error) {
        console.error('❌ Erro na função getImageUrlsFromPage:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});