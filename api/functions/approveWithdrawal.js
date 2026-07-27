// approveWithdrawal — admin aprova (paga) ou rejeita (devolve saldo) um pedido de saque.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round(n * 100) / 100;
function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
async function isAdmin(actorId) {
  if (!actorId) return false;
  const a = (await (await sb(`app_users?select=role&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json())[0];
  return a && ['admin', 'super_admin'].includes(a.role);
}
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { actor_id, withdrawal_id, decision, reason, mp_transfer_id } = body || {};
    if (!withdrawal_id || !['approve', 'reject'].includes(decision)) return res.status(400).json({ success: false, error: 'Parâmetros inválidos' });
    if (!await isAdmin(actor_id)) return res.status(403).json({ success: false, error: 'Apenas admin pode aprovar saque' });

    const w = (await (await sb(`withdrawal_requests?select=*&id=eq.${withdrawal_id}&limit=1`)).json())[0];
    if (!w) return res.status(200).json({ success: false, error: 'Pedido não encontrado' });
    if (w.status !== 'pending') return res.status(200).json({ success: false, error: 'Pedido já processado' });
    const valor = round2(Number(w.valor) || 0);
    const u = (await (await sb(`app_users?select=saldo_alocado,commission_balance&id=eq.${w.user_id}&limit=1`)).json())[0];
    const alocado = round2(Number(u?.saldo_alocado) || 0);

    if (decision === 'approve') {
      // pago: o valor sai do reservado (já saiu do disponível ao pedir)
      await sb(`withdrawal_requests?id=eq.${withdrawal_id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'paid', reviewed_at: new Date().toISOString(), mp_transfer_id: mp_transfer_id || null }) });
      await sb(`app_users?id=eq.${w.user_id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ saldo_alocado: round2(Math.max(0, alocado - valor)) }) });
      return res.status(200).json({ success: true, status: 'paid' });
    } else {
      // rejeitado: devolve o reservado pro commission_balance
      await sb(`withdrawal_requests?id=eq.${withdrawal_id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'rejected', reviewed_at: new Date().toISOString(), reject_reason: reason || 'Reprovado' }) });
      await sb(`app_users?id=eq.${w.user_id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ saldo_alocado: round2(Math.max(0, alocado - valor)), commission_balance: round2((Number(u?.commission_balance) || 0) + valor) }) });
      return res.status(200).json({ success: true, status: 'rejected' });
    }
  } catch (e) { return res.status(200).json({ success: false, error: String(e?.message || e) }); }
}
