// updateOrderStatus — atualiza o status de fulfillment de um pedido (service_role).
// Usa o campo `status` (sem DDL). Guard: ator admin/super_admin OU o vendedor do pedido.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED = ['paid', 'preparando', 'saiu_entrega', 'entregue', 'cancelado'];

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const actorId = String(body?.actorId || '').trim();
    const saleId = String(body?.saleId || '').trim();
    const status = String(body?.status || '').trim();
    const carrier = body?.carrier != null ? String(body.carrier) : undefined;
    const tracking = body?.tracking != null ? String(body.tracking) : undefined;
    if (!actorId || !saleId || !ALLOWED.includes(status)) return res.status(400).json({ success: false, error: 'Parâmetros inválidos' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // guard: ator admin/super_admin OU vendedor do pedido
    const actorArr = await (await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    const saleArr = await (await sb(`catalog_sales?select=id,seller_id&id=eq.${encodeURIComponent(saleId)}&limit=1`)).json();
    const sale = Array.isArray(saleArr) ? saleArr[0] : null;
    if (!sale) return res.status(200).json({ success: false, error: 'Pedido não encontrado' });
    const isAdmin = actor && ['admin', 'super_admin'].includes(actor.role);
    const isSeller = sale.seller_id && sale.seller_id === actorId;
    if (!isAdmin && !isSeller) return res.status(403).json({ success: false, error: 'Sem permissão' });

    const patch = { status };
    // carrier/tracking só se as colunas existirem (best-effort, ignora erro de coluna)
    if (carrier !== undefined) patch.carrier = carrier;
    if (tracking !== undefined) patch.tracking_code = tracking;
    let r = await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
    if (!r.ok) {
      // provavelmente coluna carrier/tracking_code não existe → tenta só o status
      r = await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status }) });
    }
    if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: 'Falha ao atualizar', details: t.slice(0, 200) }); }
    return res.status(200).json({ success: true, status });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
