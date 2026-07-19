// Comparai — comparação de preços de mercado (Leilão NoZap)
// Busca via helper compartilhado api/_lib/marketSearch.js (mesma fonte do painel de precificação).
// Mantém o MESMO formato de resposta da function original do Base44.
import { searchMarket } from '../_lib/marketSearch.js';

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

    const mk = await searchMarket(searchTitle);
    if (!mk.found) {
      const code = mk.reason === 'titulo_curto' ? 'INVALID_TITLE' : 'NO_VALID_RESULTS';
      const err = mk.reason === 'titulo_curto'
        ? 'Título não é descritivo o suficiente para busca'
        : 'Não encontramos preços reais para comparar no momento';
      return res.status(200).json({ success: false, error: err, errorCode: code, debug: { query: mk.query, fontes: mk.fontes } });
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
      },
      cached: false,
    });
  } catch (error) {
    return res.status(200).json({ success: false, error: 'Erro ao processar comparação', details: String(error && error.message || error) });
  }
}
