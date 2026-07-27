// Validador ML Definitivo — 3 camadas
// Garante achar produto no Mercado Livre sempre que ele existir lá.
//
// CAMADA 1: SerpAPI engine=google_shopping → filtra anúncios ML (preço já estruturado)
// CAMADA 2: SerpAPI engine=google + site:mercadolivre.com.br → extrai preço de snippets
//           (só roda se camada 1 < 3 anúncios)
// CAMADA 3: Combina + deduplica por URL + calcula mediana/p25/p75
//
// CONTRATO DE RESPOSTA: { products, stats, searchUrl } — IDÊNTICO ao formato atual
// Preserva compatibilidade com MLValidationButton, VereditoMLCard, comparaiPrices.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SERPAPI_BASE = 'https://serpapi.com/search.json';
const SERPAPI_TIMEOUT_MS = 15_000;
const TOP_N = 10;
const MAX_PRICE_OUTLIER = 1_000_000;
const MIN_PRICE = 0.5;
// Camada 2 (Google geral) frequentemente captura ratings tipo "4,72" como preço.
// Pra essa camada, exigimos preço mínimo realista de produto (R$ 10).
const MIN_PRICE_LAYER2 = 10;
const MIN_ML_THRESHOLD = 3; // se camada 1 tiver < 3 ML, ativa camada 2

// ===================================================================
// Helpers estatísticos (idênticos ao formato anterior)
// ===================================================================
function percentile(sortedAsc, p) {
    if (!sortedAsc.length) return null;
    const idx = (sortedAsc.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sortedAsc[lo];
    return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

function computeStats(prices) {
    if (!prices.length) return null;
    const sorted = [...prices].sort((a, b) => a - b);
    return {
        median: percentile(sorted, 0.5),
        p25: percentile(sorted, 0.25),
        p75: percentile(sorted, 0.75),
        min: sorted[0],
        max: sorted[sorted.length - 1],
        count: sorted.length,
    };
}

// ===================================================================
// Detecção e extração de preços
// ===================================================================
function isMercadoLivreResult(r) {
    if (!r) return false;
    const source = typeof r.source === 'string' ? r.source.toLowerCase() : '';
    if (source.includes('mercado livre') || source.includes('mercadolivre')) return true;
    const link = typeof r.link === 'string' ? r.link.toLowerCase() : '';
    if (link.includes('mercadolivre.com')) return true;
    const productLink = typeof r.product_link === 'string' ? r.product_link.toLowerCase() : '';
    if (productLink.includes('mercadolivre.com')) return true;
    return false;
}

function extractPriceFromShopping(r) {
    if (typeof r?.extracted_price === 'number') return r.extracted_price;
    if (typeof r?.price === 'number') return r.price;
    if (typeof r?.price === 'string') {
        return parsePriceString(r.price);
    }
    return null;
}

// Converte "R$ 1.234,56" → 1234.56
function parsePriceString(str) {
    if (typeof str !== 'string') return null;
    const clean = str.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return Number.isFinite(parsed) ? parsed : null;
}

// Extrai preço dos vários campos possíveis de um resultado orgânico do Google
function extractPriceFromOrganic(r) {
    if (!r) return null;

    // 1. rich_snippet.top.detected_extensions.price (numérico)
    const topPrice = r?.rich_snippet?.top?.detected_extensions?.price;
    if (typeof topPrice === 'number' && topPrice > 0) return topPrice;

    // 2. rich_snippet.bottom.detected_extensions.price
    const botPrice = r?.rich_snippet?.bottom?.detected_extensions?.price;
    if (typeof botPrice === 'number' && botPrice > 0) return botPrice;

    // 3. rich_snippet extensions array com strings de preço
    const allExts = [
        ...(r?.rich_snippet?.top?.extensions || []),
        ...(r?.rich_snippet?.bottom?.extensions || []),
    ];
    for (const ext of allExts) {
        const p = parsePriceString(ext);
        if (p && p > 0) return p;
    }

    // 4. Regex no snippet/title — captura "R$ X,YY" ou "R$ X.YYY,ZZ"
    // (about_this_result é objeto, não string — não usar)
    const candidates = [r.snippet, r.title].filter(t => typeof t === 'string' && t.length > 0);
    const priceRegex = /R\$\s?([\d.]+,\d{2})/;
    for (const text of candidates) {
        const match = text.match(priceRegex);
        if (match) {
            const p = parsePriceString(match[0]);
            if (p && p > 0) return p;
        }
    }

    return null;
}

// ===================================================================
// CAMADA 1: SerpAPI Google Shopping (preço estruturado)
// ===================================================================
async function fetchShoppingLayer(term, apiKey) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SERPAPI_TIMEOUT_MS);
    try {
        const params = new URLSearchParams({
            engine: 'google_shopping',
            q: term,
            location: 'Brazil',
            google_domain: 'google.com.br',
            gl: 'br',
            hl: 'pt-br',
            api_key: apiKey,
        });
        const url = `${SERPAPI_BASE}?${params.toString()}`;
        console.log('[Layer1] google_shopping q=', term);
        const res = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
        if (!res.ok) {
            console.log('[Layer1] status:', res.status);
            return [];
        }
        const json = await res.json();
        const results = Array.isArray(json?.shopping_results) ? json.shopping_results : [];
        const mlOnly = results.filter(isMercadoLivreResult);
        console.log('[Layer1] total:', results.length, 'ml_only:', mlOnly.length);

        return mlOnly
            .map(r => ({
                title: r?.title || '',
                price: extractPriceFromShopping(r),
                permalink: r?.link || r?.product_link || null,
                thumbnail: r?.thumbnail || null,
                source_layer: 'shopping',
            }))
            .filter(p => p.price !== null && p.price >= MIN_PRICE && p.price <= MAX_PRICE_OUTLIER && p.permalink);
    } catch (err) {
        console.log('[Layer1] catch:', err?.name, err?.message);
        return [];
    } finally {
        clearTimeout(timer);
    }
}

// ===================================================================
// CAMADA 2: SerpAPI Google + site:mercadolivre.com.br (reforço)
// ===================================================================
async function fetchGoogleSiteML(term, apiKey) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SERPAPI_TIMEOUT_MS);
    try {
        const params = new URLSearchParams({
            engine: 'google',
            q: `site:mercadolivre.com.br ${term}`,
            location: 'Brazil',
            google_domain: 'google.com.br',
            gl: 'br',
            hl: 'pt-br',
            num: '20',
            api_key: apiKey,
        });
        const url = `${SERPAPI_BASE}?${params.toString()}`;
        console.log('[Layer2] google site:mercadolivre.com.br q=', term);
        const res = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
        if (!res.ok) {
            console.log('[Layer2] status:', res.status);
            return [];
        }
        const json = await res.json();
        const organic = Array.isArray(json?.organic_results) ? json.organic_results : [];
        console.log('[Layer2] organic total:', organic.length);

        // Mantém apenas resultados que de fato apontam pro ML (segurança extra)
        const mlOrganic = organic.filter(r => {
            const link = typeof r?.link === 'string' ? r.link.toLowerCase() : '';
            return link.includes('mercadolivre.com');
        });
        console.log('[Layer2] ml_organic:', mlOrganic.length);

        const products = mlOrganic
            .map(r => {
                const link = r?.link || null;
                // Páginas de produto individual (/p/MLB...) são mais confiáveis que listagens
                const isProductPage = typeof link === 'string' && /\/(p|MLB-?\d)/i.test(link);
                return {
                    title: r?.title || '',
                    price: extractPriceFromOrganic(r),
                    permalink: link,
                    thumbnail: r?.thumbnail || (r?.rich_snippet?.top?.detected_extensions?.image) || null,
                    is_product_page: isProductPage,
                    source_layer: 'google_site',
                };
            })
            .filter(p => p.permalink); // exige URL pro permalink funcionar

        // Camada 2 frequentemente extrai rating (4,72) como preço. Filtra preços abaixo de MIN_PRICE_LAYER2.
        const withPrice = products.filter(p =>
            p.price !== null &&
            p.price >= MIN_PRICE_LAYER2 &&
            p.price <= MAX_PRICE_OUTLIER
        );
        console.log('[Layer2] with_price:', withPrice.length, 'without_price:', products.length - withPrice.length);

        return { withPrice, withoutPrice: products.filter(p => p.price === null) };
    } catch (err) {
        console.log('[Layer2] catch:', err?.name, err?.message);
        return { withPrice: [], withoutPrice: [] };
    } finally {
        clearTimeout(timer);
    }
}

// ===================================================================
// CAMADA 3: Combina + deduplica por URL canônica
// ===================================================================
function canonicalizeMLUrl(url) {
    if (!url) return '';
    try {
        const u = new URL(url);
        // Remove parâmetros de tracking — mantém só path + ID do produto
        return `${u.hostname}${u.pathname}`.toLowerCase().replace(/\/+$/, '');
    } catch {
        return url.toLowerCase();
    }
}

function dedupeByUrl(products) {
    const seen = new Map();
    for (const p of products) {
        const key = canonicalizeMLUrl(p.permalink);
        if (!key) continue;
        if (!seen.has(key)) {
            seen.set(key, p);
        } else {
            // Mantém o que tem preço sobre o que não tem
            const existing = seen.get(key);
            if (existing.price === null && p.price !== null) {
                seen.set(key, p);
            }
        }
    }
    return [...seen.values()];
}

// ===================================================================
// HANDLER
// ===================================================================
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const productName = (body?.productName || '').toString().trim();
        const limit = Math.min(Math.max(parseInt(body?.limit, 10) || 20, 1), 50);

        if (!productName || productName.length < 2) {
            return Response.json({ products: [], stats: null, error: 'empty_query' });
        }

        const apiKey = Deno.env.get('SERPAPI_KEY');
        if (!apiKey) {
            return Response.json({
                products: [],
                stats: null,
                searchUrl: `https://lista.mercadolivre.com.br/${encodeURIComponent(productName)}`,
                error: 'missing_serpapi_key',
            });
        }

        // === CAMADA 1: Google Shopping ===
        const layer1Products = await fetchShoppingLayer(productName, apiKey);

        // === CAMADA 2: só se camada 1 < 3 anúncios ML ===
        let layer2Products = [];
        let layer2Extra = [];
        if (layer1Products.length < MIN_ML_THRESHOLD) {
            console.log(`[Pipeline] Layer1 retornou ${layer1Products.length} (<${MIN_ML_THRESHOLD}). Ativando Layer2.`);
            const layer2Result = await fetchGoogleSiteML(productName, apiKey);
            layer2Products = layer2Result.withPrice;
            layer2Extra = layer2Result.withoutPrice; // mantém pra contagem de "tem no ML"
        } else {
            console.log(`[Pipeline] Layer1 retornou ${layer1Products.length} (≥${MIN_ML_THRESHOLD}). Layer2 ignorada (proteção custo).`);
        }

        // === CAMADA 3: Combina + deduplica ===
        const allWithPrice = dedupeByUrl([...layer1Products, ...layer2Products]);
        const extraNoPriceCount = layer2Extra.length;

        console.log(`[Pipeline] Final: ${allWithPrice.length} com preço, ${extraNoPriceCount} sem preço (mas existem no ML)`);

        // Se nem com preço nem sem preço → realmente não tem no ML
        if (allWithPrice.length === 0 && extraNoPriceCount === 0) {
            return Response.json({
                products: [],
                stats: null,
                searchUrl: `https://lista.mercadolivre.com.br/${encodeURIComponent(productName)}`,
                error: 'no_ml_results',
            });
        }

        // Se tem produtos no ML mas nenhum com preço → retorna lista vazia mas sem "Sem ML"
        // (caso raro: Google indexou ML mas sem rich snippet de preço)
        if (allWithPrice.length === 0) {
            return Response.json({
                products: [],
                stats: { median: null, p25: null, p75: null, min: null, max: null, count: extraNoPriceCount, avgSoldQty: 0 },
                searchUrl: `https://lista.mercadolivre.com.br/${encodeURIComponent(productName)}`,
                error: 'ml_found_no_price',
            });
        }

        // Normaliza ao formato final (compatibilidade total com consumidores)
        const normalized = allWithPrice.map((p, idx) => ({
            id: idx.toString(),
            title: p.title,
            price: p.price,
            permalink: p.permalink,
            thumbnail: p.thumbnail,
            sold_quantity: 0, // SerpAPI não fornece
            condition: null,
            seller_nickname: 'Mercado Livre',
        }));

        // Top N para estatísticas
        const topProducts = normalized.slice(0, TOP_N);
        const prices = topProducts.map(p => p.price);
        const stats = computeStats(prices);

        const products = normalized.slice(0, limit);

        return Response.json({
            products,
            stats: { ...stats, avgSoldQty: 0 },
            searchUrl: `https://lista.mercadolivre.com.br/${encodeURIComponent(productName)}`,
        });
    } catch (error) {
        return Response.json({
            products: [],
            stats: null,
            error: error?.message || 'internal_error',
        }, { status: 200 });
    }
});