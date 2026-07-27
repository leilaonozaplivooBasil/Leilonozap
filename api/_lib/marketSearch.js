// marketSearch — busca de preço de mercado compartilhada (Leilão NoZap).
// Fonte única usada por comparaiPrices (modal Comparaí) E calculateProductPricing (painel).
// Cascata: Google Shopping (SearchAPI) -> SerpAPI (se houver) -> Zoom. Primeira com resultado relevante vence.
// Retorna a MÉDIA do mercado (é a referência do Heloim: venda = média - 20%).

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SEARCHAPI_KEY = process.env.SEARCHAPI_KEY;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// Limpa o título do catálogo pra virar uma query boa. Desgruda "Pequeno500ml" -> "Pequeno 500ml"
// (títulos vêm colados e a busca não achava nada), tira ruído e fica com até 5 palavras.
export function cleanTitle(title) {
  if (!title) return '';
  const clean = String(title)
    .replace(/leil[aã]o\s*(nozap|no\s*zap)?/gi, '')
    .replace(/\b(novo|usado|semi[-\s]?novo|original|lacrado|garantia|frete\s*gr[aá]tis)\b/gi, '')
    .replace(/\b(arremate|devolu[çc][aã]o|promo[çc][aã]o|kit|combo|un|und|unidade)\b/gi, '')
    .replace(/\b(110v|220v|bivolt)\b/gi, '')
    .replace(/([a-zA-ZÀ-ÿ])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-ZÀ-ÿ]{3,})/g, '$1 $2')
    .replace(/[^\wÀ-ÿ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = clean.split(' ').filter((w) => w.length > 1 && !/^\d+$/.test(w));
  return words.slice(0, 5).join(' ');
}

export function isValidPrice(price) {
  return !(!price || price < 5 || price > 500000);
}

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
  const seen = new Set();
  return hits.filter((h) => {
    const k = `${(h.store || '').toLowerCase()}|${Math.round(h.price * 100)}|${String(h.productNameFound).toLowerCase().slice(0, 22)}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });
}

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

// ---- BUSCA POR IMAGEM (Google Lens via SearchAPI) — acha o PRODUTO EXATO, não por nome ----
// É o método principal: "torneira monocomando" por texto casa torneira profissional (R$920);
// por imagem o Lens acha a mesma torneira no ML (R$89,99). Bem mais assertivo.
async function fetchGoogleLens(imageUrl) {
  const u = `https://www.searchapi.io/api/v1/search?engine=google_lens&search_type=all&url=${encodeURIComponent(imageUrl)}&gl=br&hl=pt-br&api_key=${SEARCHAPI_KEY}`;
  const resp = await fetch(u);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.error) throw new Error(`Lens: ${data?.error || resp.status}`);
  const vm = data.visual_matches || [];
  return vm.map((m) => ({
    store: m.source || m.source_name || 'Loja',
    productNameFound: m.title || '',
    price: Number(m.price?.extracted_value) || Number(m.extracted_price) || 0,
    url: m.link || '#',
    image: m.thumbnail || '',
  })).filter((r) => r.price > 0);
}

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

// searchMarket(title, imageUrl) — roda a cascata e devolve a MÉDIA + resultados.
// PRINCIPAL = busca por IMAGEM (Google Lens, pela URL da foto do produto): acha o produto exato.
// Texto (nome) é só fallback quando não há imagem ou o Lens não trouxe nada.
// { found, source, avg, min, max, count, results:[{store,productNameFound,price,url,image}] }
export async function searchMarket(title, imageUrl) {
  const cleaned = cleanTitle(title);
  const titleWords = cleaned.toLowerCase().split(' ').filter((w) => w.length > 2);
  // busca por imagem: os matches já são visuais, não filtra por palavra (só preço válido).
  // busca por texto: exige 2 palavras do título batendo (senão casa produto de outra classe).
  const relevantes = (raw, isImage) => {
    let r = raw.filter((c) => isValidPrice(c.price));
    if (!isImage) r = r.filter((c) => {
      const found = (c.productNameFound || '').toLowerCase();
      return titleWords.filter((w) => found.includes(w)).length >= Math.min(2, titleWords.length);
    });
    return r;
  };

  const fontes = [];
  if (imageUrl && SEARCHAPI_KEY) fontes.push({ nome: 'google_lens_imagem', image: true, fn: () => fetchGoogleLens(imageUrl) });
  if (cleaned && cleaned.length >= 4) {
    if (SEARCHAPI_KEY) fontes.push({ nome: 'google_shopping', fn: () => fetchSearchApi(cleaned) });
    if (SERPAPI_KEY) fontes.push({ nome: 'serpapi', fn: () => fetchSerpApi(cleaned) });
    fontes.push({ nome: 'zoom', fn: () => fetchZoom(cleaned) });
  }
  if (!fontes.length) return { found: false, reason: 'sem_titulo_sem_imagem', query: cleaned, results: [] };

  const falhas = [];
  for (const f of fontes) {
    try {
      const raw = await f.fn();
      const r = relevantes(raw, f.image);
      falhas.push(`${f.nome}: ${raw.length} brutos, ${r.length} relevantes`);
      if (r.length > 0) {
        // MÉDIA APARADA (robusta a outliers): a busca casa itens parecidos mas de tamanhos/capacidades
        // diferentes (16gb x 256gb, kit 6 x kit 24) e um item caro inflava a média. Ancora na mediana
        // e mantém só os preços dentro de uma banda ao redor dela (0,4x a 2,2x), depois tira a média.
        const sorted = r.map((c) => c.price).sort((a, b) => a - b);
        const med = sorted[Math.floor(sorted.length / 2)];
        let band = sorted.filter((p) => p >= med * 0.4 && p <= med * 2.2);
        if (band.length < 3) band = sorted; // poucos dados: usa tudo
        const avg = band.reduce((a, b) => a + b, 0) / band.length;
        return {
          found: true, source: f.nome, query: cleaned,
          avg: Math.round(avg * 100) / 100,
          median: med, min: sorted[0], max: sorted[sorted.length - 1],
          count: band.length, total_found: r.length, results: r.slice(0, 12),
          attempts: falhas,
        };
      }
      falhas.push(`${f.nome}: 0 relevantes`);
    } catch (e) {
      falhas.push(`${f.nome}: ${String(e?.message || e).slice(0, 60)}`);
    }
  }
  return { found: false, reason: 'sem_resultado', query: cleaned, fontes: falhas, results: [] };
}
