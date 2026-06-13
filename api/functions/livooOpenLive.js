// livooOpenLive — abre uma live na Livoo Live puxando o que o usuário já cadastrou:
//  - auction  → seus LOTES de leilão (core do NoZap) viram lotes da live (lances ao vivo)
//  - commerce → produtos do catálogo viram produtos da live
// Provisiona a conta Livoo no caminho (idempotente). service_role. Sandbox-aware.
import { livoo } from '../_lib/livoo/client.js';
import { toLivooLot, toLivooProduct } from '../_lib/livoo/adapter.js';
import { oid } from '../_lib/oid.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

// provisionamento idempotente da conta Livoo (best-effort, nunca bloqueia)
async function ensureLivooAccount(user) {
  if (user.livoo_user_id) return user.livoo_user_id;
  try {
    const lu = await livoo.provisionUser({
      partner_user_id: user.id, name: user.full_name || null, email: user.email || null,
      phone: user.phone || null, role: user.primary_career_level || null,
    });
    await sb(`app_users?id=eq.${encodeURIComponent(user.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ livoo_user_id: lu.livoo_user_id, livoo_wallet_id: lu.wallet_id, livoo_kyc_status: lu.kyc_status, livoo_provisioned_at: new Date().toISOString() }) });
    return lu.livoo_user_id;
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const actorId = String(body?.actorId || '').trim();
    const mode = ['auction', 'commerce', 'hybrid'].includes(body?.mode) ? body.mode : 'auction';
    if (!actorId) return res.status(400).json({ success: false, error: 'Usuário obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const uArr = await (await sb(`app_users?select=id,full_name,email,phone,primary_career_level,livoo_user_id,livoo_wallet_id,livoo_kyc_status&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const user = Array.isArray(uArr) ? uArr[0] : null;
    if (!user) return res.status(403).json({ success: false, error: 'Usuário inválido' });

    const livooUserId = await ensureLivooAccount(user);
    if (!livooUserId) return res.status(200).json({ success: false, error: 'Não foi possível provisionar sua conta Livoo. Tente de novo.' });

    const titulo = String(body?.titulo || '').trim() || `Ao vivo de ${(user.full_name || 'NoZap').split(' ')[0]}`;
    let lotIds = []; let productIds = [];

    if (mode === 'auction' || mode === 'hybrid') {
      const a = await (await sb(`auctions?select=id,title,description,starting_price,current_price,increment,end_time,status&or=(seller_id.eq.${encodeURIComponent(actorId)},created_by_id.eq.${encodeURIComponent(actorId)})&order=created_at.desc&limit=20`)).json();
      const lots = (Array.isArray(a) ? a : []).filter((x) => !['cancelado', 'CANCELADO'].includes(x.status)).map(toLivooLot);
      if (lots.length) { await livoo.putLots(livooUserId, lots); lotIds = lots.map((l) => l.external_id); }
    }
    if (mode === 'commerce' || mode === 'hybrid') {
      // produtos próprios do host; se não tiver, usa o catálogo ativo da operação
      let pr = await (await sb(`products?select=id,description,price_catalog,selling_price_retail,image_urls,quantity&distribuidor_id=eq.${encodeURIComponent(actorId)}&limit=50`)).json();
      if (!Array.isArray(pr) || !pr.length) pr = await (await sb(`products?select=id,description,price_catalog,selling_price_retail,image_urls,quantity&catalog_active=eq.true&order=updated_date.desc&limit=50`)).json();
      const products = (Array.isArray(pr) ? pr : []).map(toLivooProduct).filter((p) => p.price_cents > 0);
      if (products.length) { await livoo.putProducts(livooUserId, products); productIds = products.map((p) => p.external_id); }
    }

    let live;
    try { live = await livoo.createLive({ host_livoo_user_id: livooUserId, mode, title: titulo, product_external_ids: productIds, lot_external_ids: lotIds }); }
    catch { return res.status(200).json({ success: false, error: 'Não foi possível abrir a transmissão agora.' }); }

    const id = oid();
    await sb('livoo_lives', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      id, host_id: actorId, host_name: user.full_name || null, titulo, mode, status: 'ao_vivo',
      livoo_session_id: live.live_id, host_url: live.host_url, embed_url: live.embed_url, inicia_at: new Date().toISOString(),
    }) });

    return res.status(200).json({ success: true, live_id: live.live_id, host_url: live.host_url, embed_url: live.embed_url, mode, lots: lotIds.length, products: productIds.length, sandbox: !!live.sandbox });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao abrir live', details: String(e?.message || e) });
  }
}
