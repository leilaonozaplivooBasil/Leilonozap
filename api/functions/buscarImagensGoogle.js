// buscarImagensGoogle — imagens pro QUADRO DOS SONHOS, "igual o Google".
//
// Ordem do dono (06/09/2026): "o buscador precisa ser foda — está trazendo
// imagens aleatórias, precisa puxar do Google igual o Google". A rota do
// catálogo (extractGoogleShoppingImages) pergunta ao Google SHOPPING — bom
// pra produto à venda, aleatório pra sonho. Esta pergunta ao Google IMAGENS
// (SerpAPI → SearchAPI de reserva → Shopping como último recurso); a conta
// está em api/_lib/imagensGoogle.js, testada no node.
//
// POST { q }  → { success, images: [originais], resultados: [{original,
//                 miniatura, titulo, fonte}], query_usada, source, trilha }
//               (`images` mantém o formato que lerRespostaFotos já lê)
// GET sem q   → health { ok, chaves: { serpapi, searchapi } }
//
// 🔐 As chaves: SERPAPI_KEY / SEARCHAPI_KEY no ambiente, ou `serpapi_key` /
// `searchapi_key` no cofre (app_segredos) — nunca chegam ao navegador.
// 🪪 Crachá na convenção do resto do sistema (exigirSessao anota; só recusa
// com SESSAO_MODO=bloquear).
import { exigirSessao } from '../_lib/sessao.js';
import { chaveDe } from '../_lib/cofre.js';
import { buscarImagensGoogle } from '../_lib/imagensGoogle.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const q = String(body?.q || body?.productName || req.query?.q || '').trim().slice(0, 160);

    const [serpapi, searchapi] = await Promise.all([chaveDe('SERPAPI_KEY', 'serpapi_key'), chaveDe('SEARCHAPI_KEY', 'searchapi_key')]);

    if (!q) return res.status(200).json({ ok: true, chaves: { serpapi: !!serpapi, searchapi: !!searchapi } });

    const sessao = exigirSessao(req, null, 'buscarImagensGoogle');
    if (!sessao.liberado) return res.status(sessao.http || 401).json({ success: false, images: [], motivo: 'sessao', error: sessao.motivo });

    if (!serpapi && !searchapi) {
      return res.status(200).json({ success: false, images: [], motivo: 'falha_busca', error: 'busca de imagens sem chave configurada (SERPAPI_KEY)', query_usada: q });
    }

    const { resultados, fonte, trilha } = await buscarImagensGoogle(q, { chaves: { serpapi, searchapi } });
    if (!resultados.length) {
      return res.status(200).json({ success: false, images: [], resultados: [], query_usada: q, motivo: 'sem_resultado', error: 'Nenhuma imagem encontrada para este termo', trilha });
    }
    return res.status(200).json({ success: true, images: resultados.map((r) => r.original), resultados, query_usada: q, source: fonte, trilha });
  } catch (e) {
    return res.status(200).json({ success: false, images: [], motivo: 'falha_busca', error: String(e?.message || e) });
  }
}
