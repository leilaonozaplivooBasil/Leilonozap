// Busca produtos do Mercado Livre via SerpAPI (Google Shopping).
// Motivo: api.mercadolibre.com bloqueia o IP do Deno Deploy (403 forbidden).
// Estratégia: usa Google Shopping (que indexa ML) e filtra somente anúncios do ML.
//
// CONTRATO DE RESPOSTA: { products, stats, searchUrl }
// Formato IDÊNTICO ao anterior — preserva compatibilidade com:
// - MLValidationButton.jsx
// - VereditoMLCard.jsx
// - comparaiPrices.js
//
// Resposta:
// {
//   products: [{ id, title, price, permalink, thumbnail, sold_quantity, condition, seller_nickname }],
//   stats: { median, p25, p75, min, max, count, avgSoldQty } | null,
//   searchUrl: "https://lista.mercadolivre.com.br/..."
// }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SERPAPI_BASE = 'https://serpapi.com/search.json';
const SERPAPI_TIMEOUT_MS = 15_000;
const TOP_N = 10;
const MAX_PRICE_OUTLIER = 1_000_000;
const MIN_PRICE = 0.5;

// Helpers estatísticos (idênticos ao formato anterior)
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

// Detecta se um resultado do Google Shopping é anúncio do Mercado Livre
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

// Extrai preço numérico de campos diversos do SerpAPI
function extractPrice(r) {
    if (typeof r?.extracted_price === 'number') return r.extracted_price;
    if (typeof r?.price === 'number') return r.price;
    if (typeof r?.price === 'string') {
        // "R$ 123,45" -> 123.45
        const num = r.price.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
        const parsed = parseFloat(num);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

async function fetchSerpApi(term, apiKey) {
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
        console.log('[SerpAPI] GET google_shopping q=', term);
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
        });
        console.log('[SerpAPI] status:', res.status);
        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            console.log('[SerpAPI] error body:', txt.slice(0, 300));
            return { results: [], httpStatus: res.status };
        }
        const json = await res.json();
        const results = Array.isArray(json?.shopping_results) ? json.shopping_results : [];
        console.log('[SerpAPI] shopping_results total:', results.length);
        return { results };
    } catch (err) {
        console.log('[SerpAPI] catch:', err?.name, err?.message);
        return { results: [], error: err?.name === 'AbortError' ? 'timeout' : (err?.message || 'fetch_error') };
    } finally {
        clearTimeout(timer);
    }
}

Deno.serve(async (req) => {
    try {
        // Auth obrigatória (mesmo padrão do searchGoogleShopping)
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

        const { results, error: fetchErr, httpStatus } = await fetchSerpApi(productName, apiKey);

        if (!results.length) {
            return Response.json({
                products: [],
                stats: null,
                searchUrl: `https://lista.mercadolivre.com.br/${encodeURIComponent(productName)}`,
                error: fetchErr || (httpStatus ? `http_${httpStatus}` : 'no_results'),
            });
        }

        // Filtra somente anúncios do Mercado Livre
        const mlOnly = results.filter(isMercadoLivreResult);
        console.log('[ML-FILTER] total:', results.length, 'ml_only:', mlOnly.length);

        // Normaliza para o formato esperado pelos consumidores
        const normalized = mlOnly
            .map(r => {
                const price = extractPrice(r);
                return {
                    id: r?.product_id || r?.position?.toString() || null,
                    title: r?.title || '',
                    price,
                    permalink: r?.link || r?.product_link || null,
                    thumbnail: r?.thumbnail || null,
                    sold_quantity: 0, // SerpAPI não fornece — mantém campo p/ compatibilidade
                    condition: null,
                    seller_nickname: r?.source || null,
                };
            })
            .filter(p => p.price !== null && p.price >= MIN_PRICE && p.price <= MAX_PRICE_OUTLIER);

        if (!normalized.length) {
            return Response.json({
                products: [],
                stats: null,
                searchUrl: `https://lista.mercadolivre.com.br/${encodeURIComponent(productName)}`,
                error: 'no_ml_results',
            });
        }

        // Top N para estatísticas (sem sold_quantity, mantém ordem original do Google = relevância)
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