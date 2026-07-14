// Comparai — comparação de preços de mercado (Leilão NoZap)
// Fonte: Zoom (comparador BR) via __NEXT_DATA__ — sem chave paga.
// Upgrade opcional: se SERPAPI_KEY estiver setada, usa Google Shopping via SerpAPI.
// Mantém o MESMO formato de resposta da function original do Base44.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SERPAPI_KEY = process.env.SERPAPI_KEY;
// 🔑 SearchAPI (Google Shopping) — a chave JÁ EXISTIA na Vercel e nunca era usada. É a fonte
// que cobre item genérico (borrifador, esponja, copo); o Zoom só tem eletrônico/marca grande,
// por isso a comparação funcionava em alguns produtos e falhava na maioria.
const SEARCHAPI_KEY = process.env.SEARCHAPI_KEY;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// ---- limpeza de título (port da function original) ----
function cleanTitle(title) {
  if (!title) return '';
  let clean = String(title)
    .replace(/leil[aã]o\s*(nozap|no\s*zap)?/gi, '')
    .replace(/\b(novo|usado|semi[-\s]?novo|original|lacrado|garantia|frete\s*gr[aá]tis)\b/gi, '')
    .replace(/\b(arremate|devolu[çc][aã]o|promo[çc][aã]o|kit|combo|un|und|unidade)\b/gi, '')
    .replace(/\b(110v|220v|bivolt)\b/gi, '')
    // 🔑 desgruda palavra+número: "Pequeno500ml" → "Pequeno 500ml".
    // Títulos do catálogo vêm com isso colado e a busca não achava NADA (era a causa real
    // de boa parte do "Comparação indisponível" — não faltava fonte, faltava query limpa).
    .replace(/([a-zA-ZÀ-ÿ])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-ZÀ-ÿ]{3,})/g, '$1 $2')
    .replace(/[^\wÀ-ÿ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // fora números soltos ("6", "5") — só somam ruído na busca
  const words = clean.split(' ').filter((w) => w.length > 1 && !/^\d+$/.test(w));
  return words.slice(0, 5).join(' ');
}

function isValidPrice(price) {
  if (!price || price < 5) return false;
  if (price > 500000) return false;
  return true;
}

// ---- busca no Zoom ----
async function fetchZoom(query) {
  const url = `https://www.zoom.com.br/search?q=${encodeURIComponent(query)}`;
  const resp = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9' } });
  if (!resp.ok) throw new Error(`Zoom HTTP ${resp.status}`);
  const html = await resp.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('Zoom: __NEXT_DATA__ não encontrado');
  const json = JSON.parse(m[1]);
  const hits = [];
  (function walk(o, depth) {
    if (!o || depth > 12 || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach((x) => walk(x, depth + 1)); return; }
    if ((o.name || o.title) && typeof o.price === 'number' && o.price > 3 && String(o.name || o.title).length > 8) {
      hits.push({
        store: o.merchantName || (o.bestOffer && o.bestOffer.merchantName) || 'Loja',
        productNameFound: o.name || o.title,
        price: o.price,
        url: o.url ? (o.url.startsWith('http') ? o.url : `https://www.zoom.com.br${o.url}`) : '#',
        image: o.image || '',
      });
    }
    Object.keys(o).forEach((k) => walk(o[k], depth + 1));
  })(json, 0);
  // dedupe: colapsa mesma loja + mesmo preço + nome parecido
  const seen = new Set();
  return hits.filter((h) => {
    const k = `${(h.store || '').toLowerCase()}|${Math.round(h.price * 100)}|${String(h.productNameFound).toLowerCase().slice(0, 22)}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });
}

// ---- busca no SerpAPI (upgrade opcional) ----
async function fetchSerpApi(query) {
  const u = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&location=Brazil&hl=pt&gl=br&api_key=${SERPAPI_KEY}`;
  const resp = await fetch(u);
  if (!resp.ok) throw new Error(`SerpAPI HTTP ${resp.status}`);
  const data = await resp.json();
  if (!data.shopping_results) return [];
  return data.shopping_results.slice(0, 15).map((r) => ({
    store: r.source || 'Loja',
    productNameFound: r.title || '',
    price: r.extracted_price || parseFloat(String(r.price || '').replace(/[^\d,]/g, '').replace(',', '.')),
    url: r.product_link || r.link || '#',
    image: r.thumbnail || '',
  }));
}

// ---- busca no SearchAPI / Google Shopping (cobre produto genérico, não só eletrônico) ----
async function fetchSearchApi(query) {
  const u = `https://www.searchapi.io/api/v1/search?engine=google_shopping&q=${encodeURIComponent(query)}&gl=br&hl=pt-br&location=Brazil&api_key=${SEARCHAPI_KEY}`;
  const resp = await fetch(u);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.error) throw new Error(`SearchAPI: ${data?.error || resp.status}`);
  const results = data.shopping_results || [];
  return results.slice(0, 20).map((r) => ({
    store: r.seller || r.source || 'Loja',
    productNameFound: r.title || '',
    price: Number(r.extracted_price) || parseFloat(String(r.price || '').replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.')),
    url: r.product_link || r.link || '#',
    image: r.thumbnail || '',
  })).filter((r) => r.price > 0);
}

async function getEntity(productId, auctionId) {
  const table = auctionId ? 'auctions' : 'products';
  const id = auctionId || productId;
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&limit=1`;
  const resp = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } });
  if (!resp.ok) throw new Error(`Supabase ${table} HTTP ${resp.status}`);
  const arr = await resp.json();
  return arr && arr[0];
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== 'object') body = {};
    const { auctionId, productId } = body;
    if (!auctionId && !productId) {
      return res.status(400).json({ success: false, error: 'auctionId ou productId obrigatório' });
    }
    if (!SUPABASE_URL || !SUPABASE_ANON) {
      return res.status(200).json({ success: false, error: 'Comparação indisponível (config)', errorCode: 'NO_CONFIG' });
    }

    const entity = await getEntity(productId, auctionId);
    if (!entity) return res.status(404).json({ success: false, error: 'Item não encontrado' });

    const searchTitle = auctionId ? entity.title : entity.description;
    const currentPrice = auctionId
      ? (entity.current_price || entity.starting_price || 0)
      : (entity.price_catalog || entity.selling_price_retail || 0);

    const cleaned = cleanTitle(searchTitle);
    if (!cleaned || cleaned.length < 4) {
      return res.status(200).json({ success: false, error: 'Título não é descritivo o suficiente para busca', errorCode: 'INVALID_TITLE' });
    }

    // 1) CASCATA de fontes: a primeira que trouxer resultado relevante vence.
    //    Google Shopping (SearchAPI/SerpAPI) cobre produto genérico; o Zoom só cobre
    //    eletrônico/marca grande — sozinho ele fazia a comparação falhar na maioria do catálogo.
    const titleWords = cleaned.toLowerCase().split(' ').filter((w) => w.length > 2);
    const relevantes = (raw) => raw
      .filter((c) => isValidPrice(c.price))
      .filter((c) => {
        const found = (c.productNameFound || '').toLowerCase();
        const match = titleWords.filter((w) => found.includes(w)).length;
        // 2 palavras batendo já indica o mesmo tipo de produto (antes exigia 25% do título
        // inteiro, o que zerava qualquer item com nome longo — a causa do "indisponível").
        return match >= Math.min(2, titleWords.length);
      });

    const fontes = [
      SEARCHAPI_KEY && { nome: 'google_shopping', fn: () => fetchSearchApi(cleaned) },
      SERPAPI_KEY && { nome: 'serpapi', fn: () => fetchSerpApi(cleaned) },
      { nome: 'zoom', fn: () => fetchZoom(cleaned) },
    ].filter(Boolean);

    let valid = [];
    let source = 'nenhuma';
    const falhas = [];
    for (const f of fontes) {
      try {
        const r = relevantes(await f.fn());
        if (r.length > 0) { valid = r; source = f.nome; break; }
        falhas.push(`${f.nome}: 0 relevantes`);
      } catch (e) {
        falhas.push(`${f.nome}: ${String(e?.message || e).slice(0, 60)}`);
      }
    }

    if (valid.length === 0) {
      return res.status(200).json({
        success: false,
        error: 'Não encontramos preços reais para comparar no momento',
        errorCode: 'NO_VALID_RESULTS',
        debug: { query: cleaned, fontes: falhas }, // ajuda a diagnosticar sem precisar de log
      });
    }

    const prices = valid.map((c) => c.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const referencePrice = avgPrice;
    const savings = referencePrice - currentPrice;
    const savingsPercent = referencePrice > 0 ? (savings / referencePrice) * 100 : 0;

    return res.status(200).json({
      success: true,
      comparison: {
        productName: searchTitle,
        ourPrice: currentPrice,
        comparisons: valid.slice(0, 12),
        cheapestMarketPrice: minPrice,
        averageMarketPrice: avgPrice,
        savings,
        savingsPercent: Math.round(savingsPercent),
        isFactoryDirect: false,
        totalStoresAnalyzed: valid.length,
        searchAttempts: 1,
        priceLabel: 'Preço Médio do Mercado',
        referencePrice,
        source,
      },
      cached: false,
    });
  } catch (error) {
    return res.status(200).json({ success: false, error: 'Erro ao processar comparação', details: String(error && error.message || error) });
  }
}
