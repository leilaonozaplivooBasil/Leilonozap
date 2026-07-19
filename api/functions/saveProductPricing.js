// saveProductPricing — salva os preços calculados nos produtos (service_role, anon não persiste).
// Atualiza selling_price_retail + price_catalog (preço da loja) + market_value.
// PUBLICAÇÃO GATED (spec Heloim): só ativa na loja (catalog_active=true) se o preço PASSAR na
// validação (validarPrecoLoja). Falhou → salva o preço mas NÃO publica (fica p/ revisão). Zero
// produto com preço absurdo ou abaixo do custo na loja.
import { validarPrecoLoja } from '../_lib/validarPreco.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) return res.status(400).json({ success: false, error: 'items obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const now = new Date().toISOString();
    let saved = 0; let published = 0; const blocked = [];
    for (const it of items) {
      const id = String(it.id || '').trim();
      const selling = round2(it.selling_price_retail);
      if (!id || !(selling > 0)) continue;
      const market = it.market_price != null ? round2(it.market_price) : 0;

      // custo atual do produto p/ validar
      const cur = await (await sb(`products?select=cost_price&id=eq.${encodeURIComponent(id)}&limit=1`)).json();
      const cost = round2(Array.isArray(cur) && cur[0] ? cur[0].cost_price : 0);

      const v = validarPrecoLoja({ cost, selling, market });

      const base = { selling_price_retail: selling, price_catalog: selling, updated_date: now };
      if (market > 0) base.market_value = market;
      if (v.ok) { base.catalog_active = true; base.status = 'ESTOQUE'; }
      else { base.catalog_active = false; base.status = 'BLOQUEADO_PRECO'; blocked.push({ id, motivo: v.motivo }); }
      if (it.source_url) base.source_url = it.source_url;

      let r = await sb(`products?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(base) });
      if (!r.ok) {
        const min = { ...base }; delete min.source_url; // source_url pode não existir
        r = await sb(`products?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(min) });
      }
      if (r.ok) {
        saved++;
        if (v.ok) {
          published++;
          try {
            await sb(`store_inventory?product_id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ price: selling, updated_at: now }) });
          } catch { /* não bloqueia */ }
        }
      }
    }
    return res.status(200).json({ success: saved > 0, saved, published, blocked: blocked.length, blocked_items: blocked.slice(0, 50) });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao salvar preços', details: String(e?.message || e) });
  }
}
