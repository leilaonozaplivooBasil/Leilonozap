// extractGoogleShoppingImages — busca fotos do produto via Google Shopping (SerpAPI).
// PONTO 56: Trocou Bing Image Search (genérico, trazia fotos erradas) pelo MESMO motor
// do Compare Aqui (api/_lib/marketSearch.js), que usa SerpAPI Google Shopping e filtra
// por relevância (2+ palavras do título batendo). Retorna { success, images: [...] }.
import { searchMarket } from '../_lib/marketSearch.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const q = String(body?.productName || body?.q || '').trim();
    if (!q) return res.status(400).json({ success: false, error: 'productName obrigatório', images: [] });

    // Usa o MESMO sistema do Compare Aqui: Google Shopping via SerpAPI
    // searchMarket filtra por relevância (2+ palavras do título batendo) e retorna
    // results com .image (thumbnail real do produto no Google Shopping)
    const mk = await searchMarket(q, null); // null = sem imagem para busca por Lens

    if (!mk.found || !mk.results || mk.results.length === 0) {
      return res.status(200).json({ success: false, images: [], error: 'Nenhum produto encontrado no Google Shopping' });
    }

    // Extrai as imagens (thumbnails) dos resultados relevantes
    const images = mk.results
      .map(r => r.image)
      .filter(u => u && /^https?:\/\//i.test(u) && !/\.svg(\?|$)/i.test(u))
      .slice(0, 6);

    // Deduplica
    const unique = [...new Set(images)];

    return res.status(200).json({
      success: unique.length > 0,
      images: unique,
      source: mk.source,
      count: mk.count
    });
  } catch (e) {
    return res.status(200).json({ success: false, images: [], error: String(e?.message || e) });
  }
}