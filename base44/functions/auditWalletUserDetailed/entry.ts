// 🔎 AUDITORIA READ-ONLY de UM usuário — caso-base antes de estender aos demais.
// NÃO grava nada em nenhuma tabela. Só lê catalog_sales, app_users, auction_messages,
// auctions, asaas_payments e mercado_pago_payments (via Supabase REST, service_role)
// e calcula o saldo esperado pra comparar com o saldo real salvo em app_users.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const DEPOSIT_KINDS = ['wallet_deposit', 'passaporte', 'commission_deposit'];

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}` },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

function money(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function ageHours(dateStr) {
  if (!dateStr) return null;
  return Math.round((Date.now() - new Date(dateStr).getTime()) / 36e5 * 10) / 10;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();
    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'super_admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { user_id, only_pendencias } = await req.json();
    const uid = String(user_id || '').trim();
    if (!uid) return Response.json({ error: 'user_id é obrigatório' }, { status: 400 });
    if (!SUPABASE_URL || !SR) return Response.json({ error: 'Config Supabase ausente' }, { status: 500 });

    const idEnc = encodeURIComponent(uid);

    const [userR, salesR, bidsR] = await Promise.all([
      sb(`app_users?select=id,full_name,saldo_disponivel,saldo_alocado&id=eq.${idEnc}`),
      sb(`catalog_sales?select=id,kind,product_title,sale_price,total_amount,status,payment_method,created_date&buyer_id=eq.${idEnc}&order=created_date.desc&limit=500`),
      sb(`auction_messages?select=id,auction_id,bid_amount,created_date&sender_id=eq.${idEnc}&message_type=eq.bid&order=created_date.desc&limit=300`),
    ]);

    if (userR.status !== 200 || !Array.isArray(userR.body) || !userR.body.length) {
      return Response.json({ error: 'Usuário não encontrado em app_users', detalhe: userR.body }, { status: 404 });
    }
    const user = userR.body[0];
    const sales = Array.isArray(salesR.body) ? salesR.body : [];
    const bids = Array.isArray(bidsR.body) ? bidsR.body : [];

    // 1) DEPÓSITOS
    const depositsAll = sales.filter((s) => DEPOSIT_KINDS.includes(s.kind));
    const depositsPaid = depositsAll.filter((s) => s.status === 'paid');
    const depositsPending = depositsAll.filter((s) => s.status !== 'paid');
    const depositsTotal = money(depositsPaid.reduce((sum, s) => sum + (Number(s.total_amount) || Number(s.sale_price) || 0), 0));

    // 2) COMPRAS (loja + arremate)
    const purchasesAll = sales.filter((s) => !DEPOSIT_KINDS.includes(s.kind));
    const purchasesPaid = purchasesAll.filter((s) => s.status === 'paid');
    const purchasesPending = purchasesAll.filter((s) => s.status !== 'paid');
    const purchasesTotal = money(purchasesPaid.reduce((sum, s) => sum + (Number(s.total_amount) || Number(s.sale_price) || 0), 0));

    // Investiga a causa de cada pendência (depósito ou compra) cruzando com o gateway
    const allPending = [...depositsPending, ...purchasesPending];
    const pendingDetalhe = [];
    for (const s of allPending) {
      let gatewayStatus = null;
      const rAsaas = await sb(`asaas_payments?select=status,billing_type,due_date&external_reference=eq.${encodeURIComponent(s.id)}`);
      if (rAsaas.status === 200 && Array.isArray(rAsaas.body) && rAsaas.body[0]) gatewayStatus = { fonte: 'asaas', ...rAsaas.body[0] };
      if (!gatewayStatus) {
        const r = await sb(`mercado_pago_payments?select=status,payment_method&external_reference=eq.${encodeURIComponent(s.id)}`);
        if (r.status === 200 && Array.isArray(r.body) && r.body[0]) gatewayStatus = { fonte: 'mercado_pago', ...r.body[0] };
      }
      pendingDetalhe.push({
        id: s.id,
        tipo: DEPOSIT_KINDS.includes(s.kind) ? 'deposito' : 'compra',
        titulo: s.product_title || (DEPOSIT_KINDS.includes(s.kind) ? 'Depósito' : 'Compra'),
        valor: Number(s.total_amount) || Number(s.sale_price) || 0,
        status_interno: s.status,
        idade_horas: ageHours(s.created_date),
        data: s.created_date,
        gateway: gatewayStatus || 'nenhum pagamento encontrado no gateway (PIX nunca foi gerado ou não foi vinculado)',
      });
    }

    // 3) LANCES — agrupa por leilão, pega o maior lance do usuário em cada, cruza com o vencedor
    const auctionIds = [...new Set(bids.map((b) => b.auction_id).filter(Boolean))];
    let auctionsInfo = [];
    if (auctionIds.length) {
      const inList = auctionIds.map((i) => `"${encodeURIComponent(i)}"`).join(',');
      const r = await sb(`auctions?select=id,title,status,winner_id,current_price&id=in.(${inList})`);
      if (r.status === 200 && Array.isArray(r.body)) auctionsInfo = r.body;
    }
    const auctionById = Object.fromEntries(auctionsInfo.map((a) => [a.id, a]));

    const maxBidByAuction = {};
    for (const b of bids) {
      const cur = maxBidByAuction[b.auction_id];
      if (!cur || Number(b.bid_amount) > Number(cur)) maxBidByAuction[b.auction_id] = Number(b.bid_amount);
    }

    let leiloesGanhos = 0, leiloesPerdidos = 0, valorGanho = 0;
    const leiloesDetalhe = Object.keys(maxBidByAuction).map((aid) => {
      const a = auctionById[aid];
      const venceu = !!(a && a.winner_id === uid);
      if (venceu) { leiloesGanhos++; valorGanho = money(valorGanho + maxBidByAuction[aid]); }
      else leiloesPerdidos++;
      return {
        auction_id: aid,
        titulo: a?.title || 'Leilão não encontrado',
        status_leilao: a?.status || null,
        meu_maior_lance: maxBidByAuction[aid],
        venceu,
      };
    });

    // 4) SALDO CALCULADO x SALDO REAL
    // Compras (kind arremate/loja) já refletem o valor debitado quando o leilão é ganho —
    // por isso lances NÃO entram de novo no cálculo, são só cruzamento informativo.
    const saldoCalculado = money(depositsTotal - purchasesTotal);
    const saldoReal = Number(user.saldo_disponivel) || 0;
    const diferenca = money(saldoCalculado - saldoReal);

    if (only_pendencias) {
      return Response.json({ pendencias_detalhe: pendingDetalhe });
    }
    return Response.json({
      usuario: { id: user.id, nome: user.full_name, saldo_disponivel: saldoReal, saldo_alocado: user.saldo_alocado },
      depositos: {
        total_confirmado: depositsTotal,
        quantidade_confirmada: depositsPaid.length,
        pendentes: depositsPending.length,
      },
      compras: {
        total_pago: purchasesTotal,
        quantidade_paga: purchasesPaid.length,
        pendentes: purchasesPending.length,
      },
      pendencias_detalhe: pendingDetalhe,
      lances: {
        total_leiloes_com_lance: leiloesDetalhe.length,
        leiloes_ganhos: leiloesGanhos,
        leiloes_perdidos: leiloesPerdidos,
        valor_total_arrematado: valorGanho,
        detalhe: leiloesDetalhe,
      },
      auditoria: {
        saldo_calculado: saldoCalculado,
        saldo_real: saldoReal,
        diferenca,
        bate: Math.abs(diferenca) < 0.01,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});