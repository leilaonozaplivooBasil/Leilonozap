// extractGoogleShoppingImages — busca fotos do produto via Google Shopping.
// PONTO 56: trocou Bing Image Search pelo MESMO motor do Compare Aqui
// (api/_lib/marketSearch.js → SerpAPI/SearchAPI Google Shopping).
//
// PONTO 77 CAMADA 2 — por que a busca voltava vazia com título longo:
// searchMarket foi feito para PREÇO, então descarta todo resultado sem preço
// válido (>= R$5) e exige 2 palavras batendo. Para FOTO isso é excessivo: a foto
// do produto serve mesmo sem preço na vitrine. Agora existe uma cascata:
//   1) searchMarket com o título limpo (caminho já validado em produção)
//   2) searchMarket com as 3 primeiras palavras (núcleo do produto)
//   3) SerpAPI Google Shopping direto, SÓ para thumbnails (sem filtro de preço)
// Para na primeira tentativa que devolver imagem. Sempre { success, images, ... }.
import { searchMarket, cleanTitle } from '../_lib/marketSearch.js';

const SERPAPI_KEY = process.env.SERPAPI_KEY;

// Só URL http(s) de imagem real, sem SVG e sem duplicata.
function limparUrls(lista) {
  const validas = (lista || []).filter(
    (u) => typeof u === 'string' && /^https?:\/\//i.test(u) && !/\.svg(\?|$)/i.test(u)
  );
  return [...new Set(validas)].slice(0, 12);
}

// Tentativa 3 — SerpAPI Google Shopping cru: aproveita TODOS os campos de imagem
// que a API devolve, sem exigir preço. É o que garante foto de produto baratinho.
async function thumbnailsDiretoSerpApi(query) {
  if (!SERPAPI_KEY) return [];
  const u = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&location=Brazil&hl=pt&gl=br&api_key=${SERPAPI_KEY}`;
  const resp = await fetch(u);
  if (!resp.ok) throw new Error(`SerpAPI HTTP ${resp.status}`);
  const data = await resp.json();
  const urls = [];
  for (const r of data.shopping_results || []) {
    if (r.thumbnail) urls.push(r.thumbnail);
    if (r.serpapi_thumbnail) urls.push(r.serpapi_thumbnail);
    for (const p of r.product_photos || []) urls.push(typeof p === 'string' ? p : p?.link);
  }
  for (const r of data.inline_images || []) urls.push(r?.thumbnail || r?.original);
  return urls.filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const q = String(body?.productName || body?.q || '').trim();
    if (!q) return res.status(400).json({ success: false, error: 'productName obrigatório', images: [] });

    // Núcleo do produto: cleanTitle já tira ruído de marketplace (Und, Kit, barras,
    // símbolos) e limita a 5 palavras. As 3 primeiras são a rede mais larga.
    const limpo = cleanTitle(q) || q;
    const curto = limpo.split(' ').slice(0, 3).join(' ');

    const tentativas = [
      { nome: 'google_shopping_titulo', termo: limpo },
      ...(curto && curto !== limpo ? [{ nome: 'google_shopping_curto', termo: curto }] : []),
    ];

    const trilha = [];

    // 1 e 2 — mesmo motor do Compare Aqui (caminho já em produção)
    for (const t of tentativas) {
      try {
        const mk = await searchMarket(t.termo, null);
        const images = limparUrls((mk.results || []).map((r) => r.image));
        trilha.push(`${t.nome}("${t.termo}"): ${images.length} imagens`);
        if (images.length > 0) {
          return res.status(200).json({ success: true, images, query_usada: t.termo, source: mk.source, trilha });
        }
      } catch (e) {
        trilha.push(`${t.nome}: erro ${String(e?.message || e).slice(0, 80)}`);
      }
    }

    // 3 — thumbnails direto, sem filtro de preço nem de relevância
    try {
      const images = limparUrls(await thumbnailsDiretoSerpApi(curto || limpo));
      trilha.push(`serpapi_thumbnails("${curto || limpo}"): ${images.length} imagens`);
      if (images.length > 0) {
        return res.status(200).json({ success: true, images, query_usada: curto || limpo, source: 'serpapi_thumbnails', trilha });
      }
    } catch (e) {
      trilha.push(`serpapi_thumbnails: erro ${String(e?.message || e).slice(0, 80)}`);
    }

    // Nada encontrado, mas SEM erro: é "não achei", não "falhou".
    return res.status(200).json({
      success: false,
      images: [],
      query_usada: limpo,
      motivo: 'sem_resultado',
      error: 'Nenhuma foto encontrada para este termo',
      trilha,
    });
  } catch (e) {
    // Falha de verdade (rede, chave, exceção): sinaliza como ERRO, não como vazio.
    return res.status(200).json({
      success: false,
      images: [],
      motivo: 'falha_busca',
      error: String(e?.message || e),
    });
  }
}