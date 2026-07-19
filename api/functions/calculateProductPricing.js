// calculateProductPricing — calcula preço sugerido p/ produtos (service_role). NÃO salva (só preview).
// Fluxo do Heloim: por produto, busca o mercado real (média de várias lojas) e define venda = média - 20%.
// Usa o MESMO motor de busca do Comparaí (api/_lib/marketSearch.js). Se não achar mercado, preserva o
// mercado já existente; só usa markup sobre custo como último recurso (nunca achata lote inteiro).
import { searchMarket } from '../_lib/marketSearch.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const DESCONTO = 0.20;     // venda = média do mercado - 20% (regra do Heloim)
const MARKUP_CUSTO = 2.0;  // último recurso, sem mercado nenhum: mercado estimado = custo × 2

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const ids = Array.isArray(body?.product_ids) ? body.product_ids.map(String) : [];
    if (!ids.length) return res.status(400).json({ success: false, error: 'product_ids obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const inList = ids.map((i) => `"${encodeURIComponent(i)}"`).join(',');
    const prods = await (await sb(`products?select=id,description,lot,cost_price,market_value,selling_price_retail,price_catalog&id=in.(${inList})`)).json();
    const list = Array.isArray(prods) ? prods : [];

    const out = [];
    for (const p of list) {
      const cost = Number(p.cost_price) || 0;
      const prevMarket = Number(p.market_value) || 0;
      const prevPrice = Number(p.selling_price_retail || p.price_catalog) || 0;
      let market = 0; let source = 'custo'; let sourceUrl = ''; let stores = 0;

      // 1) BUSCA DE MERCADO REAL (média de várias lojas) — o caminho principal.
      const mk = await searchMarket(p.description);
      if (mk.found && mk.avg > 0) {
        market = mk.avg; source = mk.source; stores = mk.count;
        sourceUrl = (mk.results && mk.results[0] && mk.results[0].url) || '';
      }
      // 2) Sem mercado na busca: preserva o mercado já existente (não achatar). Nunca sobrescreve com markup.
      if (market === 0) {
        if (prevMarket > 0) { market = prevMarket; source = 'mercado_anterior'; }
        else if (cost > 0) { market = round2(cost * MARKUP_CUSTO); source = 'custo'; }
      }

      // venda = mercado - 20% (regra do Heloim). Sem piso artificial (o piso custo×1,25 criava
      // paredões de preço repetido em itens de lote com custo médio único).
      const selling = market > 0 ? round2(market * (1 - DESCONTO)) : 0;

      out.push({
        id: p.id, description: p.description, lot: p.lot,
        status: selling > 0 ? 'success' : 'failed',
        market_price: market, selling_price_retail: selling,
        calculated_price: selling, // alias usado pelo PricingPreviewModal
        previous_market: prevMarket, previous_price: prevPrice,
        source, source_url: sourceUrl, stores_analyzed: stores,
        cost_price: cost,
        below_cost: selling > 0 && cost > 0 && selling < cost, // sinaliza p/ o operador conferir
      });
    }
    return res.status(200).json({ success: true, products: out });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao calcular preços', details: String(e?.message || e) });
  }
}
