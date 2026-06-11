// getMyWallet — devolve a carteira do PRÓPRIO usuário (saldo, extrato de comissões, saques, KYC).
// Lê as tabelas financeiras via service_role (elas são privadas pra anon).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const userId = String(body?.user_id || '').trim();
    if (!userId) return res.status(400).json({ success: false, error: 'Usuário obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const user = (await (await sb(`app_users?select=saldo_disponivel,saldo_alocado,commission_balance,kyc_status,cpf,full_name&id=eq.${encodeURIComponent(userId)}&limit=1`)).json())[0];
    if (!user) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });
    const commissions = await (await sb(`commission_ledger?select=created_at,role_in_sale,pct,amount,beneficiary_level&beneficiary_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=100`)).json();
    const withdrawals = await (await sb(`withdrawal_requests?select=valor,status,requested_at,reviewed_at,reject_reason&user_id=eq.${encodeURIComponent(userId)}&order=requested_at.desc&limit=50`)).json();
    const kyc = (await (await sb(`kyc_data?select=submitted_at,reviewed_at,reject_reason&user_id=eq.${encodeURIComponent(userId)}&limit=1`)).json())[0] || null;

    return res.status(200).json({
      success: true,
      saldo_disponivel: Number(user.saldo_disponivel) || 0,
      saldo_alocado: Number(user.saldo_alocado) || 0,
      commission_balance: Number(user.commission_balance) || 0,
      kyc_status: user.kyc_status || 'nao_iniciado',
      cpf: user.cpf || null,
      commissions: Array.isArray(commissions) ? commissions : [],
      withdrawals: Array.isArray(withdrawals) ? withdrawals : [],
      kyc,
    });
  } catch (e) { return res.status(200).json({ success: false, error: String(e?.message || e) }); }
}
