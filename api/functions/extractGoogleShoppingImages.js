// extractGoogleShoppingImages — busca fotos do produto (Bing Images, grátis, sem chave).
// Robusto: timeout + try/catch + filtro de URLs válidas. Retorna { success, images: [...] }.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

function valid(u) {
  if (!u || !/^https?:\/\//i.test(u)) return false;
  if (u.length > 700) return false;
  if (/\.svg(\?|$)/i.test(u)) return false;
  if (/(sprite|logo|icon|placeholder|blank)\b/i.test(u)) return false;
  return true;
}

async function bingImages(query, max) {
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9' } });
  if (!resp.ok) return [];
  const html = await resp.text();
  const out = []; const seen = new Set();
  const re = /murl&quot;:&quot;(.*?)&quot;/g; let m;
  while ((m = re.exec(html)) && out.length < max) {
    const u = m[1].replace(/\\u002f/g, '/').replace(/\\\//g, '/');
    if (valid(u) && !seen.has(u)) { seen.add(u); out.push(u); }
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const q = String(body?.productName || body?.q || '').trim();
    if (!q) return res.status(400).json({ success: false, error: 'productName obrigatório', images: [] });
    let images = [];
    try { images = await bingImages(q.slice(0, 90), 8); } catch { images = []; }
    // fallback: tenta um termo mais curto se não achou
    if (images.length === 0) {
      try { images = await bingImages(q.split(' ').slice(0, 4).join(' '), 8); } catch { images = []; }
    }
    return res.status(200).json({ success: images.length > 0, images, source: 'bing' });
  } catch (e) {
    return res.status(200).json({ success: false, images: [], error: String(e?.message || e) });
  }
}
