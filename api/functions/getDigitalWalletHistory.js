// getDigitalWalletHistory — extrato financeiro completo do usuário para a carteira.
// Monta as transações a partir de catalog_sales (depósitos, arremates, compras de loja),
// commission_ledger (comissões recebidas) e withdrawal_requests (saques).
// Lido via service_role porque as tabelas financeiras são privadas pra anon.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

const DEPOSIT_KINDS = ['wallet_deposit', 'passaporte', 'commission_deposit'];

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const userId = String(body?.user_id || '').trim();
    if (!userId) return res.status(400).json({ success: false, error: 'Usuário obrigatório', transactions: [] });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente', transactions: [] });

    const uid = encodeURIComponent(userId);
    const saleCols = 'id,kind,product_title,sale_price,total_amount,quantity,status,payment_method,tracking_code,created_date,buyer_id,buyer_name';
    const [salesR, mySalesR, commsR, wdR] = await Promise.all([
      sb(`catalog_sales?select=${saleCols}&buyer_id=eq.${uid}&order=created_date.desc&limit=200`),
      // vendas em que o usuário é o VENDEDOR (admin/lojista): o que vendeu, pra quem e quanto
      sb(`catalog_sales?select=${saleCols}&seller_id=eq.${uid}&status=eq.paid&kind=not.in.(wallet_deposit,passaporte,commission_deposit)&order=created_date.desc&limit=100`),
      sb(`commission_ledger?select=created_at,role_in_sale,pct,amount,beneficiary_level&beneficiary_id=eq.${uid}&order=created_at.desc&limit=100`),
      sb(`withdrawal_requests?select=valor,status,requested_at&user_id=eq.${uid}&order=requested_at.desc&limit=50`),
    ]);
    const sales = await salesR.json();
    const mySales = await mySalesR.json();
    const comms = await commsR.json();
    const wds = await wdR.json();

    const transactions = [];

    for (const s of Array.isArray(sales) ? sales : []) {
      const amount = Number(s.total_amount) || Number(s.sale_price) || 0;
      const isDeposit = DEPOSIT_KINDS.includes(s.kind);
      transactions.push({
        id: s.id,
        type: isDeposit ? 'deposit' : 'purchase',
        title: isDeposit
          ? (s.kind === 'passaporte' ? 'Passaporte de Lances'
            : s.kind === 'commission_deposit' ? 'Depósito — Carteira de Comissões'
            : 'Depósito na Carteira')
          : (s.product_title || 'Compra'),
        source: isDeposit
          ? (s.payment_method === 'pix_mp' ? 'PIX' : (s.payment_method || 'Pagamento'))
          : (s.kind === 'arremate' ? 'Leilão' : 'Loja'),
        amount: isDeposit ? amount : -amount,
        quantity: s.quantity || 1,
        status: s.status === 'paid' ? 'paid' : (s.status === 'pending_payment' ? 'pending' : s.status),
        tracking_code: s.tracking_code || null,
        date: s.created_date,
      });
    }

    for (const s of Array.isArray(mySales) ? mySales : []) {
      if (s.buyer_id === userId) continue; // compra própria já listada acima
      transactions.push({
        id: `sale-${s.id}`,
        type: 'sale',
        title: `Venda — ${s.product_title || 'Produto'}`,
        source: s.buyer_name ? `para ${s.buyer_name}` : (s.kind === 'arremate' ? 'Leilão' : 'Loja'),
        amount: Number(s.total_amount) || Number(s.sale_price) || 0,
        quantity: s.quantity || 1,
        status: 'paid',
        tracking_code: s.tracking_code || null,
        date: s.created_date,
      });
    }

    for (const c of Array.isArray(comms) ? comms : []) {
      transactions.push({
        id: `comm-${c.created_at}-${c.amount}`,
        type: 'commission',
        title: `Comissão recebida${c.pct ? ` (${c.pct}%)` : ''}`,
        source: c.role_in_sale || 'Rede',
        amount: Number(c.amount) || 0,
        status: c.status || 'paid',
        date: c.created_at,
      });
    }

    for (const w of Array.isArray(wds) ? wds : []) {
      transactions.push({
        id: `wd-${w.requested_at}-${w.valor}`,
        type: 'withdrawal',
        title: 'Saque solicitado',
        source: 'Saque',
        amount: -(Number(w.valor) || 0),
        status: w.status || 'pending',
        date: w.requested_at,
      });
    }

    transactions.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return res.status(200).json({ success: true, transactions });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e), transactions: [] });
  }
}
