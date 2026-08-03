// payAdhesionWithTestBalance — paga a adesão de Vendedor (R$1.497) usando o saldo de TESTE
// (test_wallet_balance) creditado pelo admin. Debita o saldo de teste e credita
// seller_credit_balance, exatamente como o webhook faz num pagamento real — mas SEM
// gerar CatalogSale nem comissão, então não afeta o saldo real de ninguém na rede.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VALOR_MINIMO = 1497;

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
    const { user_id, amount } = body || {};
    if (!SUPABASE_URL || !SR) return res.status(200).json({ success: false, error: 'Banco não configurado' });
    if (!user_id) return res.status(200).json({ success: false, error: 'user_id é obrigatório' });
    const value = Number(amount) || VALOR_MINIMO;
    if (value < VALOR_MINIMO) return res.status(200).json({ success: false, error: `A primeira compra do vendedor é de no mínimo R$ ${VALOR_MINIMO}` });

    const rows = await (await sb(`app_users?select=id,test_wallet_balance,seller_credit_balance&id=eq.${encodeURIComponent(user_id)}&limit=1`)).json();
    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });

    const currentTestBalance = Number(user.test_wallet_balance || 0);
    if (currentTestBalance < value) {
      return res.status(200).json({ success: false, error: 'Saldo de teste insuficiente' });
    }

    const newSellerCredit = Number(user.seller_credit_balance || 0) + value;
    await sb(`app_users?id=eq.${encodeURIComponent(user_id)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        test_wallet_balance: currentTestBalance - value,
        seller_credit_balance: newSellerCredit,
      }),
    });

    return res.status(200).json({ success: true, seller_credit_balance: newSellerCredit });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao pagar com saldo de teste', details: String(e?.message || e) });
  }
}