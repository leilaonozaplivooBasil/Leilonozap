// getAdminFinanceQueue — fila do admin: KYCs em análise (com docs) + saques pendentes.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
    if (!await isAdmin(body?.actor_id)) return res.status(403).json({ success: false, error: 'Apenas admin' });

    const pend = await (await sb(`app_users?select=id,full_name,email,cpf,kyc_status&kyc_status=eq.em_analise&limit=100`)).json();
    const kyc = [];
    for (const u of (Array.isArray(pend) ? pend : [])) {
      const d = (await (await sb(`kyc_data?select=doc_front,doc_back,selfie,address_proof,pix_key,submitted_at&user_id=eq.${u.id}&limit=1`)).json())[0] || {};
      kyc.push({ user_id: u.id, full_name: u.full_name, email: u.email, cpf: u.cpf, ...d });
    }
    const withdrawals = await (await sb(`withdrawal_requests?select=id,user_id,user_name,user_email,valor,pix_key,status,requested_at&status=eq.pending&order=requested_at.asc&limit=100`)).json();
    return res.status(200).json({ success: true, kyc, withdrawals: Array.isArray(withdrawals) ? withdrawals : [] });
  } catch (e) { return res.status(200).json({ success: false, error: String(e?.message || e) }); }
}
