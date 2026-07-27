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
    const [salesR, mySalesR, commsR, recordsR, wdR] = await Promise.all([
      sb(`catalog_sales?select=${saleCols}&buyer_id=eq.${uid}&order=created_date.desc&limit=200`),
      // vendas em que o usuário é o VENDEDOR (admin/lojista): o que vendeu, pra quem e quanto
      sb(`catalog_sales?select=${saleCols}&seller_id=eq.${uid}&status=eq.paid&kind=not.in.(wallet_deposit,passaporte,commission_deposit)&order=created_date.desc&limit=100`),
      // ATENÇÃO: são DUAS tabelas de comissão. commission_records é a das vendas de
      // LOJA (motor arvoreOficial) e commission_ledger é a dos demais tipos. Lendo só
      // o ledger, o extrato mostrava "Comissões R$ 0,00" para quem tinha recebido de
      // verdade — foi o que o Gabriel viu no painel dele em 27/07/2026.
      sb(`commission_ledger?select=created_at,role_in_sale,pct,amount,beneficiary_level,sale_id&beneficiary_id=eq.${uid}&order=created_at.desc&limit=100`),
      sb(`commission_records?select=created_date,role,percent,amount,sale_id,product_title,sale_amount,status&user_id=eq.${uid}&order=created_date.desc&limit=200`),
      sb(`withdrawal_requests?select=valor,status,requested_at&user_id=eq.${uid}&order=requested_at.desc&limit=50`),
    ]);
    const sales = await salesR.json();
    const mySales = await mySalesR.json();
    const comms = await commsR.json();
    const records = await recordsR.json();
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

    // De quem foi a compra que gerou cada comissão. Sem isso o extrato dizia só
    // "Comissão recebida (5%)", e não dava para conferir de qual venda veio.
    const idsVenda = [...new Set([
      ...(Array.isArray(records) ? records : []).map((r) => r.sale_id),
      ...(Array.isArray(comms) ? comms : []).map((c) => c.sale_id),
    ].filter(Boolean))].slice(0, 200);
    const vendasDaComissao = {};
    if (idsVenda.length) {
      try {
        const inList = idsVenda.map((i) => `"${encodeURIComponent(i)}"`).join(',');
        const vr = await (await sb(`catalog_sales?select=id,product_title,buyer_name,buyer_id,total_amount&id=in.(${inList})`)).json();
        for (const v of Array.isArray(vr) ? vr : []) vendasDaComissao[v.id] = v;
      } catch { /* sem o detalhe, a linha ainda aparece com o que tem */ }
    }
    const nomeDoComprador = (v) => (v?.buyer_name || '').trim();

    const PAPEL = {
      influenciador: 'Influenciador', vendedor: 'Vendedor', licenciado: 'Licenciado',
      parceiro: 'Parceiro', ponto_retirada: 'Ponto de Retirada', loja_fisica: 'Loja Física',
      distribuidor: 'Distribuidor', executivo: 'Sócio Executivo', ceo: 'CEO',
      livoo_live: 'Livoo Live', embaixador: 'Embaixador', conselheiro: 'Conselheiro',
      fundador: 'Fundador', diretoria_executiva: 'Diretoria Executiva',
      diretoria_operacao: 'Diretoria de Operação', empresa_rollup: 'Empresa',
      venda_direta: 'Venda direta', override: 'Rede',
    };

    // comissões das vendas de LOJA
    for (const r of Array.isArray(records) ? records : []) {
      const v = vendasDaComissao[r.sale_id];
      const produto = r.product_title || v?.product_title || 'Venda';
      const comprador = nomeDoComprador(v);
      const papel = PAPEL[r.role] || r.role || 'Rede';
      transactions.push({
        id: `rec-${r.sale_id}-${r.role}-${r.amount}`,
        type: 'commission',
        title: `Comissão ${papel}${r.percent ? ` (${r.percent}%)` : ''} — ${produto}`,
        source: comprador ? `compra de ${comprador}` : 'Rede',
        amount: Number(r.amount) || 0,
        status: r.status === 'confirmed' ? 'paid' : (r.status || 'paid'),
        date: r.created_date,
      });
    }

    // comissões dos demais tipos (adesão, carteira…)
    for (const c of Array.isArray(comms) ? comms : []) {
      const v = vendasDaComissao[c.sale_id];
      const produto = v?.product_title || '';
      const comprador = nomeDoComprador(v);
      const papel = PAPEL[c.role_in_sale] || c.role_in_sale || 'Rede';
      transactions.push({
        id: `comm-${c.created_at}-${c.amount}`,
        type: 'commission',
        title: `Comissão ${papel}${c.pct ? ` (${c.pct}%)` : ''}${produto ? ` — ${produto}` : ''}`,
        source: comprador ? `compra de ${comprador}` : 'Rede',
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
