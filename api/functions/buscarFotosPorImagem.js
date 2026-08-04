// buscarFotosPorImagem — PONTO 77 CAMADA 3
// Busca fotos do MESMO produto usando a FOTO como referência (Google Lens),
// não o nome. Motivo: buscar por texto trazia produto errado — "Ferro de Passar
// Vertical a Vapor" devolvia ferro de passar comum, "Mini Pipoqueira" devolvia
// máquina de algodão doce. A imagem identifica o produto exato; o texto não.
//
// Entrada:  { imageUrl: "https://..." }  (a foto de capa do leilão)
// Saída:    { success, images: [...], source, trilha }
//
// ⚠️ Devolve SOMENTE URLs de imagem. Nunca título, descrição ou preço — em leilão
// com lance ativo sobrescrever esses campos seria destrutivo.
const SERPAPI_KEY = process.env.SERPAPI_KEY;

function limparUrls(lista) {
  const validas = (lista || []).filter(
    (u) => typeof u === 'string' && /^https?:\/\//i.test(u) && !/\.svg(\?|$)/i.test(u)
  );
  return [...new Set(validas)].slice(0, 12);
}

// Google Lens: visual_matches são produtos visualmente IGUAIS ao da foto enviada.
async function lensPorImagem(imageUrl) {
  if (!SERPAPI_KEY) throw new Error('SERPAPI_KEY não configurada');
  const u = `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(imageUrl)}&hl=pt&country=br&api_key=${SERPAPI_KEY}`;
  const resp = await fetch(u);
  if (!resp.ok) throw new Error(`SerpAPI Lens HTTP ${resp.status}`);
  const data = await resp.json();
  if (data.error) throw new Error(String(data.error).slice(0, 120));

  const urls = [];
  // Correspondências visuais (o caminho principal — produto idêntico)
  for (const m of data.visual_matches || []) {
    if (m.thumbnail) urls.push(m.thumbnail);
    if (m.image) urls.push(m.image);
  }
  // Resultados de compra da mesma foto (quando o Lens reconhece o produto)
  for (const m of data.shopping_results || data.products || []) {
    if (m.thumbnail) urls.push(m.thumbnail);
  }
  return urls.filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const trilha = [];
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const imageUrl = String(body?.imageUrl || '').trim();

    if (!/^https?:\/\//i.test(imageUrl)) {
      return res.status(400).json({
        success: false,
        images: [],
        motivo: 'sem_imagem',
        error: 'Envie a URL de uma foto do produto (imageUrl)',
      });
    }

    const images = limparUrls(await lensPorImagem(imageUrl));
    trilha.push(`google_lens: ${images.length} imagens`);

    if (images.length === 0) {
      return res.status(200).json({
        success: false,
        images: [],
        motivo: 'sem_resultado',
        error: 'Nenhuma foto parecida encontrada para esta imagem',
        trilha,
      });
    }

    return res.status(200).json({ success: true, images, source: 'google_lens', trilha });
  } catch (e) {
    // Falha real (rede, chave, cota) — sinaliza erro, não "não achei".
    return res.status(200).json({
      success: false,
      images: [],
      motivo: 'falha_busca',
      error: String(e?.message || e),
      trilha,
    });
  }
}