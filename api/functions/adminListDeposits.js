// adminListDeposits — lista TODOS os depósitos (carteira, passaporte, comissão)
// de TODOS os usuários, pra tela AdminDepositosConfirmados.jsx.
//
// Antes, essa tela consultava a entidade WalletTransaction (tabela
// wallet_transactions), que nunca é escrita por nenhum fluxo de depósito real —
// ficava sempre vazia. Os depósitos de verdade são gravados em catalog_sales
// (kind = wallet_deposit/passaporte/commission_deposit) por createMPWalletDeposit.js
// e confirmados por mpWebhook.js. Esta função lê da fonte certa.
//
// Autenticação: body.actorId precisa ser admin/super_admin.

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

const DEPOSIT_KINDS = ['wallet_deposit', 'passaporte', 'commission_deposit'];
const COLS = 'id,kind,status,payment_method,total_amount,sale_price,created_date,buyer_id,buyer_name,buyer_email';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido', deposits: [] });
  if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente', deposits: [] });

  let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const actorId = String(body?.actorId || '').trim();
  if (!actorId) return res.status(403).json({ success: false, error: 'actorId obrigatório', deposits: [] });

  const actorRows = await (await sb(`app_users?select=primary_career_level,role&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
  const actor = Array.isArray(actorRows) ? actorRows[0] : null;
  const isAdmin = actor && (['admin', 'super_admin'].includes(actor.role) || ['admin', 'super_admin'].includes(actor.primary_career_level));
  if (!isAdmin) return res.status(403).json({ success: false, error: 'Acesso restrito a administradores', deposits: [] });

  try {
    const kindFilter = DEPOSIT_KINDS.map(k => encodeURIComponent(k)).join(',');
    const rows = await (await sb(
      `catalog_sales?select=${COLS}&kind=in.(${kindFilter})&order=created_date.desc&limit=1000`
    )).json();

    const deposits = (Array.isArray(rows) ? rows : []).map(r => ({
      id: r.id,
      user_id: r.buyer_id,
      email: r.buyer_email || '',
      name: r.buyer_name || '',
      kind: r.kind,
      amount: Number(r.total_amount) || Number(r.sale_price) || 0,
      status: r.status === 'paid' ? 'confirmed' : (r.status === 'pending_payment' ? 'pending' : (r.status === 'canceled' || r.status === 'cancelled' ? 'failed' : (r.status || 'pending'))),
      payment_method: r.payment_method || '',
      created_date: r.created_date,
    }));

    return res.status(200).json({ success: true, deposits });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e), deposits: [] });
  }
}
