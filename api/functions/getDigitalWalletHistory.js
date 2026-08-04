// getDigitalWalletHistory — extrato da Carteira Digital do usuário (versão Vercel).
// Espelho fiel de base44/functions/getDigitalWalletHistory/entry.ts, que nunca é chamada
// em produção (base44.functions.invoke roteia para /api/functions/, não pro Deno).
// Sem este arquivo, a tela "Carteira Digital" (Perfil → Carteira Digital) recebia 404
// e, dependendo do estado, acabava caindo no ErrorBoundary em loop ("Detectamos um problema").
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
const SALE_COLS = 'id,kind,product_title,sale_price,total_amount,quantity,status,payment_method,tracking_code,created_date,buyer_id,buyer_name';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido', transactions: [] });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const userId = String(body?.user_id || '').trim();
    if (!userId) return res.status(400).json({ success: false, error: 'Usuário obrigatório', transactions: [] });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente', transactions: [] });

    const uid = encodeURIComponent(userId);

    const [sales, mySales, wds, bidMessages] = await Promise.all([
      sb(`catalog_sales?select=${SALE_COLS}&buyer_id=eq.${uid}&order=created_date.desc&limit=200`).then(r => r.json()).catch(() => []),
      sb(`catalog_sales?select=${SALE_COLS}&seller_id=eq.${uid}&status=eq.paid&kind=not.in.(wallet_deposit,passaporte,commission_deposit)&order=created_date.desc&limit=100`).then(r => r.json()).catch(() => []),
      sb(`withdrawal_requests?select=valor,status,requested_at&user_id=eq.${uid}&order=requested_at.desc&limit=50`).then(r => r.json()).catch(() => []),
      // 🚚 PONTO 85 — frete_amount e timestamp ENTRARAM no select. Causa-raiz do frete
      // que nunca aparecia: o PostgREST devolve SOMENTE as colunas pedidas, então
      // m.frete_amount vinha undefined → 0 → a tela nunca tinha o que mostrar.
      // timestamp serve de data alternativa para lances antigos com created_date nulo.
      sb(`auction_messages?select=id,auction_id,bid_amount,created_date,timestamp,frete_amount&sender_id=eq.${uid}&message_type=eq.bid&order=created_date.desc&limit=100`).then(r => r.json()).catch(() => []),
    ]);

    const transactions = [];

    for (const s of Array.isArray(sales) ? sales : []) {
      const amount = Number(s.total_amount) || Number(s.sale_price) || 0;
      const isDeposit = DEPOSIT_KINDS.includes(s.kind);
      if (isDeposit && s.status === 'cancelled') continue;
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
      if (s.buyer_id === userId) continue;
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

    // Lances dados em leilões — só informativo (não somam/subtraem do saldo).
    const bids = Array.isArray(bidMessages) ? bidMessages : [];
    const auctionIds = [...new Set(bids.map(m => m.auction_id).filter(Boolean))].slice(0, 60);
    const auctionTitles = {};
    // PONTO 84: o extrato precisa do ESTADO real do leilão para dizer ao cliente se o
    // valor está reservado (liderando), se voltou pro saldo (superado) ou se foi usado
    // no arremate. Sem isso o <BidStateTag> da tela nunca recebia estado e não aparecia.
    const auctionInfo = {};
    if (auctionIds.length > 0) {
      try {
        const idsList = auctionIds.map(id => encodeURIComponent(id)).join(',');
        const auctionsData = await (await sb(
          `auctions?select=id,title,status,winner_id,frete_reservado_valor&id=in.(${idsList})`
        )).json();
        if (Array.isArray(auctionsData)) {
          for (const a of auctionsData) { auctionTitles[a.id] = a.title; auctionInfo[a.id] = a; }
        }
      } catch { /* segue sem os títulos */ }
    }

    // O estado vale só para o MAIOR lance do usuário em cada leilão. Lances anteriores
    // dele mesmo já foram cobertos por ele — recebem 'superado', nunca dois "liderando".
    const maiorLancePorLeilao = {};
    for (const m of bids) {
      const atual = maiorLancePorLeilao[m.auction_id];
      if (!atual || (Number(m.bid_amount) || 0) > (Number(atual.bid_amount) || 0)) {
        maiorLancePorLeilao[m.auction_id] = m;
      }
    }

    for (const m of bids) {
      const a = auctionInfo[m.auction_id] || {};
      const ehMaiorDoUsuario = maiorLancePorLeilao[m.auction_id]?.id === m.id;
      const souOLider = ehMaiorDoUsuario && a.winner_id === userId;
      const bidState = souOLider
        ? (a.status === 'active' ? 'liderando' : 'arrematado')
        : 'superado';
      // 🚚 PONTO 84 (camada 2) — o frete agora vem do PRÓPRIO lance
      // (auction_messages.frete_amount, coluna criada em 04/08/2026 e confirmada por
      // leitura no banco). Assim o frete aparece em TODO lance, inclusive nos já
      // superados — antes só existia o frete do líder atual, em
      // auctions.frete_reservado_valor. Lances gravados ANTES da coluna existir voltam
      // 0 e simplesmente não exibem a linha de frete, sem quebrar nada.
      const freteAmount = Number(m.frete_amount) || 0;
      // 🏷️ PONTO 85 — rótulo do frete conforme o estado do lance. Enviado para a tela
      // poder explicar ao cliente se o frete está reservado ou se já voltou pro saldo
      // (a devolução do frete junto do lance já acontece no servidor, no submitAtomicBid).
      // ⚠️ O WalletDrawer ainda não lê este campo — exibi-lo exige alterar a tela, o que
      // NÃO foi autorizado neste ponto. Campo extra é inofensivo: quem não lê, ignora.
      const freteLabel = freteAmount > 0
        ? (bidState === 'liderando' ? 'reservado' : bidState === 'superado' ? 'devolvido junto' : null)
        : null;
      transactions.push({
        id: `bid-${m.id}`,
        type: 'bid',
        title: `Lance — ${auctionTitles[m.auction_id] || 'Leilão'}`,
        source: 'Leilão',
        amount: Number(m.bid_amount) || 0,
        status: 'info',
        bid_state: bidState,
        frete_amount: freteAmount,
        frete_label: freteLabel,
        // 🕐 PONTO 85 — lances gravados ANTES do PONTO 84 nasceram com created_date nulo
        // e desapareciam da lista visível. timestamp é a data alternativa real.
        date: m.created_date || m.timestamp || null,
      });
    }

    // 🕐 PONTO 85 — ordenação à prova de data ausente/inválida. Antes, uma data nula virava
    // NaN na subtração, e comparador que devolve NaN deixa a ordenação IMPREVISÍVEL: o item
    // podia parar em qualquer posição e escapar dos 15 primeiros que a tela mostra.
    // Agora data inválida vale 0 (vai para o fim, de forma determinística).
    const ts = (d) => { const t = new Date(d || 0).getTime(); return Number.isFinite(t) ? t : 0; };
    transactions.sort((a, b) => ts(b.date) - ts(a.date));

    return res.status(200).json({ success: true, transactions });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e), transactions: [] });
  }
}