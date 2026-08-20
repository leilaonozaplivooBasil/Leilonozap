// Comparai — comparação de preços de mercado (Leilão NoZap)
// Busca via helper compartilhado api/_lib/marketSearch.js (mesma fonte do painel de precificação).
// Mantém o MESMO formato de resposta da function original do Base44.
import { searchMarket } from '../_lib/marketSearch.js';
import { chamarRuntimeBase44 } from '../_lib/base44Runtime.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

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

    const imgUrl = Array.isArray(entity.image_urls) && entity.image_urls[0] ? entity.image_urls[0]
      : (Array.isArray(entity.images) && entity.images[0] ? entity.images[0] : null);
    const mk = await searchMarket(searchTitle, imgUrl); // busca por imagem primeiro

    // 🌉 PONTO 92 (20/08/2026) — PONTE DE PREÇO PRO RUNTIME BASE44.
    // Provado pelo diagnóstico na tela do dono: aqui na Vercel a SEARCHAPI_KEY
    // respondeu "You have used all of the searches for the month" nas TRÊS
    // fontes, a SERPAPI_KEY não está publicada, e o Zoom trouxe 0 relevantes.
    // Mas a ponte pro Base44 respondeu com 12 fotos — ou seja, a SERPAPI DE LÁ
    // está viva e com saldo. A function comparaiPrices do runtime Base44 usa
    // exatamente essa chave, NÃO exige login e devolve o MESMO formato de
    // resposta desta aqui. Então, quando tudo aqui falha, perguntamos pra lá.
    // ⚠️ Sem recursão: o endpoint do runtime executa a versão Deno
    // (base44/functions/comparaiPrices/entry.ts), que é outro arquivo.
    if (!mk.found) {
      try {
        const ponte = await chamarRuntimeBase44(
          'comparaiPrices',
          auctionId ? { auctionId } : { productId },
          20000,
        );
        const comps = ponte?.comparison?.comparisons;
        if (ponte?.success && Array.isArray(comps) && comps.length > 0) {
          return res.status(200).json({
            success: true,
            comparison: {
              ...ponte.comparison,
              comparisons: comps.map((c) => ({ ...c, matchLevel: c.matchLevel || 'texto' })),
              source: 'ponte_base44_shopping',
              attempts: [...(mk.attempts || []), `ponte_base44_shopping: ${comps.length} anúncios com preço`],
            },
            cached: false,
          });
        }
        mk.attempts = [...(mk.attempts || []), `ponte_base44_shopping: ${String(ponte?.error || 'sem resultado').slice(0, 90)}`];
      } catch (e) {
        mk.attempts = [...(mk.attempts || []), `ponte_base44_shopping: ${String(e?.message || e).slice(0, 90)}`];
      }
    }

    if (!mk.found) {
      // 🔦 PONTO 91 (20/08/2026) — a tela dizia sempre a MESMA frase ("não
      // encontramos preços") para causas totalmente diferentes: chave não
      // publicada, cota estourada, produto sem foto, ou produto achado mas sem
      // preço público. O dono ficava sem saber o que corrigir. Agora cada caso
      // tem sua mensagem, e a trilha completa (`attempts`) vai junto pra tela.
      let code = 'NO_VALID_RESULTS';
      let err = 'Não encontramos preços reais para comparar no momento';
      if (mk.reason === 'titulo_curto') {
        code = 'INVALID_TITLE';
        err = 'Título não é descritivo o suficiente para busca';
      } else if (mk.reason === 'identidade_sem_preco') {
        code = 'IDENTIDADE_SEM_PRECO';
        err = 'Encontramos o produto exato, mas nenhuma loja publicou o preço agora';
      } else if (mk.reason === 'sem_titulo_sem_imagem') {
        code = 'SEM_FOTO_SEM_TITULO';
        err = 'Este anúncio não tem foto nem título suficiente para comparar';
      }
      return res.status(200).json({
        success: false,
        error: err,
        errorCode: code,
        identityMatches: mk.results || [],
        debug: {
          query: mk.query,
          fontes: mk.fontes || mk.attempts || [],
          attempts: mk.attempts || mk.fontes || [],
          tinhaImagem: !!imgUrl,
        },
      });
    }

    const referencePrice = mk.avg;
    const savings = referencePrice - currentPrice;
    const savingsPercent = referencePrice > 0 ? (savings / referencePrice) * 100 : 0;

    return res.status(200).json({
      success: true,
      comparison: {
        productName: searchTitle,
        ourPrice: currentPrice,
        comparisons: mk.results,
        cheapestMarketPrice: mk.min,
        averageMarketPrice: mk.avg,
        savings,
        savingsPercent: Math.round(savingsPercent),
        isFactoryDirect: false,
        totalStoresAnalyzed: mk.count,
        searchAttempts: 1,
        priceLabel: 'Preço Médio do Mercado',
        referencePrice,
        source: mk.source,
        // Trilha do que cada fonte devolveu — o modal mostra sob demanda, pra
        // nunca mais ficarmos cegos sobre de onde o número veio (PONTO 91).
        attempts: mk.attempts || [],
      },
      cached: false,
    });
  } catch (error) {
    return res.status(200).json({ success: false, error: 'Erro ao processar comparação', details: String(error && error.message || error) });
  }
}
