// calculateProductPricing — calcula preço sugerido p/ produtos (service_role). NÃO salva (só preview).
// Fluxo do Heloim: por produto, busca o mercado real (média de várias lojas) e define venda = média - 20%.
// Usa o MESMO motor de busca do Comparaí (api/_lib/marketSearch.js). Se não achar mercado, preserva o
// mercado já existente; só usa markup sobre custo como último recurso (nunca achata lote inteiro).
import { searchMarket } from '../_lib/marketSearch.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const DESCONTO = 0.20;     // venda = média do mercado - 20% (regra do Heloim). ÚNICA regra de preço.
const TETO_CUSTO = 5;      // freio de sanidade (spec Heloim): mercado acima de custo×5 = busca casou
                           // produto de classe errada (ex.: torneira de R$90 cotada a R$920). NÃO aplica: revisão.

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
    const prods = await (await sb(`products?select=id,description,lot,cost_price,market_value,selling_price_retail,price_catalog,image_urls&id=in.(${inList})`)).json();
    const list = Array.isArray(prods) ? prods : [];

    const out = [];
    for (const p of list) {
      const cost = Number(p.cost_price) || 0;
      const prevMarket = Number(p.market_value) || 0;
      const prevPrice = Number(p.selling_price_retail || p.price_catalog) || 0;
      // REGRA ÚNICA (pilar do negócio): preço SÓ sai da busca de mercado real (média das lojas − 20%).
      // NUNCA custo×2, NUNCA faixa antiga do import. Sem mercado real → não inventa preço, marca p/ revisão.
      const imgUrl = Array.isArray(p.image_urls) && p.image_urls[0] ? p.image_urls[0] : null;
      const mk = await searchMarket(p.description, imgUrl); // imagem primeiro, texto de fallback
      if (!mk.found || !(mk.avg > 0)) {
        out.push({
          id: p.id, description: p.description, lot: p.lot,
          status: 'sem_mercado', // não achou mercado real: NÃO precifica
          market_price: 0, selling_price_retail: 0, calculated_price: 0,
          previous_market: prevMarket, previous_price: prevPrice,
          source: 'sem_mercado', source_url: '', stores_analyzed: 0, cost_price: cost,
          needs_review: true, query: mk.query || '',
        });
        continue;
      }

      const market = mk.avg;
      // FREIO DE SANIDADE: mercado muito acima do custo = a busca casou produto de classe errada
      // (torneira de R$90 saindo cotada a R$920). Não aplica preço absurdo — manda pra revisão.
      if (cost > 0 && market > cost * TETO_CUSTO) {
        out.push({
          id: p.id, description: p.description, lot: p.lot,
          status: 'revisar_preco_alto',
          market_price: market, selling_price_retail: 0, calculated_price: 0,
          previous_market: prevMarket, previous_price: prevPrice,
          source: mk.source, source_url: (mk.results && mk.results[0] && mk.results[0].url) || '',
          stores_analyzed: mk.count, cost_price: cost, needs_review: true,
          ratio_custo: Math.round(market / cost),
        });
        continue;
      }
      const selling = round2(market * (1 - DESCONTO)); // venda = média do mercado − 20%
      out.push({
        id: p.id, description: p.description, lot: p.lot,
        status: 'success',
        market_price: market, selling_price_retail: selling,
        calculated_price: selling, // alias usado pelo PricingPreviewModal
        previous_market: prevMarket, previous_price: prevPrice,
        source: mk.source, source_url: (mk.results && mk.results[0] && mk.results[0].url) || '',
        stores_analyzed: mk.count, cost_price: cost,
        below_cost: cost > 0 && selling < cost, // sinaliza p/ o operador conferir
      });
    }
    return res.status(200).json({ success: true, products: out });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao calcular preços', details: String(e?.message || e) });
  }
}
