// Busca produtos na API oficial AUTENTICADA do Mercado Livre Brasil (MLB).
// OAuth Client Credentials usando ML_CLIENT_ID + ML_CLIENT_SECRET (cofre de secrets).
// Retorna mediana/p25/p75 dos top 10 anúncios mais vendidos — preço de mercado real.
// CONTRATO DE RESPOSTA: { products, stats, searchUrl } — IGUAL ao formato anterior
// para preservar compatibilidade com MLValidationButton, VereditoMLCard, comparaiPrices.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ML_API_BASE = 'https://api.mercadolibre.com/sites/MLB/search';
const ML_OAUTH_URL = 'https://api.mercadolibre.com/oauth/token';
const ML_TIMEOUT_MS = 10_000;
const TOP_N = 10;
const MAX_PRICE_OUTLIER = 1_000_000;
const MIN_PRICE = 0.5;

// ===================================================================
// CACHE DE TOKEN — vive enquanto o módulo Deno estiver "quente"
// ===================================================================
let cachedToken = { value: null, expiresAt: 0 };

async function getMLAccessToken() {
    const now = Date.now();
    // Reusa token se ainda válido (margem de 60s antes de expirar)
    if (cachedToken.value && cachedToken.expiresAt - 60_000 > now) {
        return cachedToken.value;
    }

    const clientId = Deno.env.get('ML_CLIENT_ID');
    const clientSecret = Deno.env.get('ML_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
        throw new Error('missing_ml_credentials');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);
    try {
        const body = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
        });
        console.log('[ML OAuth] POST', ML_OAUTH_URL);
        const res = await fetch(ML_OAUTH_URL, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            body: body.toString(),
        });
        console.log('[ML OAuth] status:', res.status);
        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            console.log('[ML OAuth] error body:', txt.slice(0, 500));
            throw new Error(`oauth_http_${res.status}`);
        }
        const json = await res.json();
        const accessToken = json?.access_token;
        const expiresIn = typeof json?.expires_in === 'number' ? json.expires_in : 21_600; // default 6h
        if (!accessToken) throw new Error('oauth_no_token');

        cachedToken = {
            value: accessToken,
            expiresAt: now + expiresIn * 1000,
        };
        console.log('[ML OAuth] token obtido, expira em', expiresIn, 's');
        return accessToken;
    } finally {
        clearTimeout(timer);
    }
}

// ===================================================================
// Helpers estatísticos (idênticos ao anterior)
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
// Busca autenticada na API oficial do ML
// ===================================================================
async function fetchMLApi(term, condition, accessToken) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);
    try {
        const params = new URLSearchParams({ q: term, limit: '50' });
        if (condition) params.set('condition', condition);
        const url = `${ML_API_BASE}?${params.toString()}`;
        console.log('[ML API] GET', url);
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'Mozilla/5.0 (compatible; LeilaoNoZapBot/1.0)',
            },
        });
        console.log('[ML API] status:', res.status, 'ok:', res.ok);
        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            console.log('[ML API] error body:', txt.slice(0, 500));
            // Se 401, invalida cache do token pra forçar refresh na próxima
            if (res.status === 401) {
                cachedToken = { value: null, expiresAt: 0 };
            }
            return { results: [], httpStatus: res.status };
        }
        const json = await res.json();
        console.log('[ML API] results count:', Array.isArray(json?.results) ? json.results.length : 'NOT_ARRAY');
        return { results: Array.isArray(json?.results) ? json.results : [] };
    } catch (err) {
        console.log('[ML API] catch:', err?.name, err?.message);
        return { results: [], error: err?.name === 'AbortError' ? 'timeout' : (err?.message || 'fetch_error') };
    } finally {
        clearTimeout(timer);
    }
}

Deno.serve(async (req) => {
    const _debug = { steps: [] };
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

        // === Obtém access_token (cache em memória) ===
        let accessToken;
        try {
            accessToken = await getMLAccessToken();
        } catch (oauthErr) {
            console.log('[ML] OAuth falhou:', oauthErr?.message);
            return Response.json({
                products: [],
                stats: null,
                searchUrl: `https://lista.mercadolivre.com.br/${encodeURIComponent(productName)}`,
                error: oauthErr?.message || 'oauth_failed',
            });
        }

        // === Fase 1: prioriza NOVOS (preço de referência mais confiável) ===
        let fase1 = await fetchMLApi(productName, 'new', accessToken);
        _debug.steps.push({ phase: 'new', count: fase1.results.length, httpStatus: fase1.httpStatus || null, error: fase1.error || null });
        let results = fase1.results;
        let httpError = fase1.error;

        // === Fase 2: se 0 novos, aceita qualquer condição ===
        if (!results.length) {
            // Se token foi invalidado por 401, tenta renovar uma vez
            if (!cachedToken.value) {
                try { accessToken = await getMLAccessToken(); } catch (_) { /* mantém o anterior */ }
            }
            const fallback = await fetchMLApi(productName, null, accessToken);
            _debug.steps.push({ phase: 'any', count: fallback.results.length, httpStatus: fallback.httpStatus || null, error: fallback.error || null });
            results = fallback.results;
            if (!results.length && fallback.error) httpError = fallback.error;
        }

        if (!results.length) {
            const searchUrl = `https://lista.mercadolivre.com.br/${encodeURIComponent(productName)}`;
            return Response.json({
                products: [],
                stats: null,
                searchUrl,
                error: httpError || 'no_results',
                _debug,
            });
        }

        // === Normaliza + filtra outliers ===
        const normalized = results
            .map(r => ({
                id: r?.id || null,
                title: r?.title || '',
                price: typeof r?.price === 'number' ? r.price : null,
                permalink: r?.permalink || null,
                thumbnail: r?.thumbnail || null,
                sold_quantity: typeof r?.sold_quantity === 'number' ? r.sold_quantity : 0,
                condition: r?.condition || null,
                seller_nickname: r?.seller?.nickname || null,
            }))
            .filter(p => p.price !== null && p.price >= MIN_PRICE && p.price <= MAX_PRICE_OUTLIER);

        if (!normalized.length) {
            return Response.json({
                products: [],
                stats: null,
                searchUrl: `https://lista.mercadolivre.com.br/${encodeURIComponent(productName)}`,
                error: 'no_valid_prices',
            });
        }

        // === Ordena por sold_quantity DESC (mais vendidos = referência) ===
        normalized.sort((a, b) => b.sold_quantity - a.sold_quantity);

        // === Top N para estatísticas ===
        const topProducts = normalized.slice(0, TOP_N);
        const prices = topProducts.map(p => p.price);
        const stats = computeStats(prices);
        const avgSoldQty = topProducts.reduce((sum, p) => sum + (p.sold_quantity || 0), 0) / topProducts.length;

        const products = normalized.slice(0, limit);

        return Response.json({
            products,
            stats: { ...stats, avgSoldQty },
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