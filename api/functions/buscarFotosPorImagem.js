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
// 🔑 PONTO 77 CAMADA 4 — MOTOR PRINCIPAL = runtime Base44 (ponte servidor→servidor).
// CAUSA-RAIZ: a SERPAPI_KEY vive no cofre do Base44 e NÃO é visível para
// process.env aqui na Vercel — daí "SERPAPI_KEY não configurada" na tela, mesmo com
// a conta SerpAPI válida e com saldo. E a SEARCHAPI_KEY (usada pelo Compare Aqui)
// está com a cota do mês esgotada. As duas chaves locais seguem como reserva.
import { chamarRuntimeBase44, urlsDeImagem } from '../_lib/base44Runtime.js';

const SEARCHAPI_KEY = process.env.SEARCHAPI_KEY;
const SERPAPI_KEY = process.env.SERPAPI_KEY;

function limparUrls(lista) {
  const validas = (lista || []).filter(
    (u) => typeof u === 'string' && /^https?:\/\//i.test(u) && !/\.svg(\?|$)/i.test(u)
  );
  return [...new Set(validas)].slice(0, 12);
}

// Google Lens via SearchAPI — caminho já validado em produção no Compare Aqui.
async function lensSearchApi(imageUrl) {
  if (!SEARCHAPI_KEY) throw new Error('SEARCHAPI_KEY não configurada');
  const u = `https://www.searchapi.io/api/v1/search?engine=google_lens&search_type=all&url=${encodeURIComponent(imageUrl)}&gl=br&hl=pt-br&api_key=${SEARCHAPI_KEY}`;
  const resp = await fetch(u);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.error) throw new Error(`SearchAPI Lens: ${data?.error || resp.status}`);
  const urls = [];
  for (const m of data.visual_matches || []) {
    if (m.thumbnail) urls.push(m.thumbnail);
    if (m.image) urls.push(m.image);
  }
  return urls.filter(Boolean);
}

// Google Lens via SerpAPI (reserva): visual_matches são produtos visualmente IGUAIS.
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

    // Cascata: runtime Base44 (tem a chave) → SearchAPI → SerpAPI. Para na primeira
    // que devolver foto; só reporta falha se TODAS falharem.
    // Sem recursão: quem responde no runtime é a versão Deno
    // (base44/functions/buscarFotosPorImagem/entry.ts), outro arquivo.
    let images = [];
    const falhas = [];
    const motores = [
      // 1º — runtime Base44: único ambiente que enxerga a SERPAPI_KEY (comprovado)
      { nome: 'runtime_base44_lens', fn: async () => urlsDeImagem(await chamarRuntimeBase44('buscarFotosPorImagem', { imageUrl })) },
      // 2º e 3º — reserva local, caso essas chaves sejam publicadas aqui um dia
      { nome: 'searchapi_lens', fn: () => lensSearchApi(imageUrl) },
      { nome: 'serpapi_lens', fn: () => lensPorImagem(imageUrl) },
    ];
    for (const motor of motores) {
      try {
        images = limparUrls(await motor.fn());
        trilha.push(`${motor.nome}: ${images.length} imagens`);
        if (images.length > 0) break;
      } catch (e) {
        const msg = String(e?.message || e).slice(0, 120);
        falhas.push(`${motor.nome}: ${msg}`);
        trilha.push(`${motor.nome}: erro ${msg}`);
      }
    }

    // TODAS as fontes quebraram (chave/rede/cota) — isso é FALHA, não "não achei".
    if (images.length === 0 && falhas.length === motores.length) {
      return res.status(200).json({
        success: false,
        images: [],
        motivo: 'falha_busca',
        error: falhas.join(' | '),
        trilha,
      });
    }

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