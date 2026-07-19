// calculateProductPricing — calcula preço sugerido p/ produtos (service_role). NÃO salva (só preview).
// Estratégia por produto: busca preço de mercado no Zoom; se achar usa mercado×0,8 (com piso no custo);
// se não achar, cai pra markup sobre o custo. Robusto pra uso ao vivo (Diana opera hoje).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEARCHAPI_KEY = process.env.SEARCHAPI_KEY || '';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const DESCONTO = 0.20;     // preço de venda = mercado - 20%
const MARKUP_CUSTO = 2.0;  // sem mercado: mercado estimado = custo × 2
const PISO_CUSTO = 1.25;   // venda nunca abaixo de custo × 1,25

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

// Caminho antigo: Google Shopping via SearchApi.io
async function searchApiMarket(query) {
  if (!SEARCHAPI_KEY) return { price: 0, url: '' };
  try {
    const url = `https://www.searchapi.io/api/v1/search?engine=google_shopping&gl=br&hl=pt-br&num=20&q=${encodeURIComponent(query)}&api_key=${SEARCHAPI_KEY}`;
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) return { price: 0, url: '' };
    const j = await resp.json();
    const results = j.shopping_results || j.shopping_ads || [];
    const prices = [];
    let firstUrl = '';
    for (const r of results) {
      const p = Number(r.extracted_price ?? r.price);
      if (p > 5 && p < 500000) { prices.push(p); if (!firstUrl) firstUrl = r.product_link || r.link || ''; }
    }
    if (!prices.length) return { price: 0, url: '' };
    prices.sort((a, b) => a - b);
    return { price: prices[Math.floor(prices.length / 2)], url: firstUrl }; // mediana
  } catch { return { price: 0, url: '' }; }
}

async function zoomMarket(query) {
  try {
    const url = `https://www.zoom.com.br/search?q=${encodeURIComponent(query)}`;
    const resp = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9' } });
    if (!resp.ok) return 0;
    const html = await resp.text();
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) return 0;
    const prices = [];
    const walk = (o) => {
      if (!o || typeof o !== 'object') return;
      if ((o.name || o.title) && typeof o.price === 'number' && o.price > 5 && o.price < 500000) prices.push(o.price);
      for (const k in o) { const v = o[k]; if (v && typeof v === 'object') walk(v); }
    };
    walk(JSON.parse(m[1]));
    if (!prices.length) return 0;
    prices.sort((a, b) => a - b);
    return prices[Math.floor(prices.length / 2)]; // mediana
  } catch { return 0; }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const ids = Array.isArray(body?.product_ids) ? body.product_ids.map(String) : [];
    const useZoom = body?.zoom !== false;
    const useSearchApi = body?.searchapi !== false; // lote passa false (markup custo, rápido)
    if (!ids.length) return res.status(400).json({ success: false, error: 'product_ids obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const inList = ids.map((i) => `"${encodeURIComponent(i)}"`).join(',');
    const prods = await (await sb(`products?select=id,description,lot,cost_price,market_value,selling_price_retail,price_catalog&id=in.(${inList})`)).json();
    const list = Array.isArray(prods) ? prods : [];

    const out = [];
    for (const p of list) {
      const cost = Number(p.cost_price) || 0;
      const prevMarket = Number(p.market_value) || 0;
      const prevPrice = Number(p.selling_price_retail || p.price_catalog) || 0;
      let market = 0; let source = 'custo'; let sourceUrl = '';

      // 1) Google Shopping (SearchApi) — caminho antigo (individual; lote pula pra ser rápido)
      if (useSearchApi && p.description) {
        const sa = await searchApiMarket(String(p.description).slice(0, 90));
        if (sa.price > 0 && (cost === 0 || sa.price > cost)) { market = sa.price; source = 'google_shopping'; sourceUrl = sa.url; }
      }
      // 2) Zoom (fallback)
      if (market === 0 && useZoom && p.description) {
        const zm = await zoomMarket(String(p.description).slice(0, 80));
        if (zm > 0 && (cost === 0 || zm > cost)) { market = zm; source = 'zoom'; }
      }
      // 3) fallback: PRESERVA o preço de mercado real que já existe. Só estima por markup (custo×2)
      // quando o produto NÃO tem mercado. Antes o markup sobrescrevia mercado real -> achatou lotes
      // inteiros em custo×2 (bug lote 46-48/51/58). Nunca destruir mercado individual já pesquisado.
      if (market === 0) {
        if (prevMarket > 0) { market = prevMarket; source = 'mercado_anterior'; }
        else if (cost > 0) { market = round2(cost * MARKUP_CUSTO); source = 'custo'; }
      }

      let selling = market > 0 ? round2(market * (1 - DESCONTO)) : 0;
      if (cost > 0 && selling > 0 && selling < cost * PISO_CUSTO) selling = round2(cost * PISO_CUSTO);

      out.push({
        id: p.id, description: p.description, lot: p.lot,
        status: selling > 0 ? 'success' : 'failed',
        market_price: market, selling_price_retail: selling,
        calculated_price: selling, // alias usado pelo PricingPreviewModal
        previous_market: prevMarket, previous_price: prevPrice,
        source, source_url: sourceUrl, cost_price: cost,
      });
    }
    return res.status(200).json({ success: true, products: out });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao precificar', details: String(e?.message || e) });
  }
}
