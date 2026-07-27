// extractMLImages — tenta imagens do Mercado Livre (hoje a API pública bloqueia 403).
// Degrada gracioso: retorna found:false e o client cai pro Bing (extractGoogleShoppingImages).
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const url = String(body?.productUrl || '').trim();
    if (!url) return res.status(200).json({ success: false, found: false, images: [] });
    // ML bloqueia scraping/API anônima — não força (evita erro). Client usa o Bing como fonte.
    return res.status(200).json({ success: false, found: false, images: [], motivo: 'ml_bloqueado' });
  } catch (e) {
    return res.status(200).json({ success: false, found: false, images: [], error: String(e?.message || e) });
  }
}
