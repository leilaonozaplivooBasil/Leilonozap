// 🔎 AUDITORIA READ-ONLY — não grava nada. Calcula saldo real por usuário cruzando:
// depósitos aprovados (catalog_sales kind=wallet_deposit, status=paid)
// + comissões pagas (commission_records, status=paid/confirmed)
// - compras confirmadas pagas com saldo da carteira (catalog_sales kind=loja, status=paid, payment_method contém 'wallet'/'saldo')
// - holds de lance nunca liberados (digital_wallet_transactions type=bid_hold sem bid_release/settlement correspondente)
// Compara com app_users.saldo_disponivel atual. NÃO faz nenhum PATCH/DELETE.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function sbFetch(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

function money(n: number): number { return Math.round((Number(n) || 0) * 100) / 100; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();
    if (!authUser || authUser.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { user_ids } = await req.json();
    if (!Array.isArray(user_ids) || !user_ids.length) {
      return Response.json({ error: 'user_ids (array) é obrigatório' }, { status: 400 });
    }
    const idsParam = user_ids.join(',');

    // 0) Amostra de colunas de catalog_sales (pra saber se dá pra distinguir compra paga com saldo)
    const sampleCols = await sbFetch('catalog_sales?select=*&limit=1');
    const columnNames = sampleCols.status === 200 && Array.isArray(sampleCols.body) && sampleCols.body[0]
      ? Object.keys(sampleCols.body[0])
      : [];

    // 1) Saldo atual no banco
    const currentBalances = await sbFetch(`app_users?select=id,full_name,saldo_disponivel,saldo_alocado&id=in.(${idsParam})`);

    // 2) Depósitos aprovados (catalog_sales kind=wallet_deposit, status=paid)
    const deposits = await sbFetch(`catalog_sales?select=buyer_id,buyer_name,sale_price,mp_payment_id,created_date&kind=eq.wallet_deposit&status=eq.paid&buyer_id=in.(${idsParam})&order=created_date.asc`);

    // 3) Compras de catálogo confirmadas (kind=loja, status=paid) — só pra ver o payment_method usado (se foi 'saldo'/'wallet', debita a carteira; se foi pix/cartão externo, não debita)
    const purchases = await sbFetch(`catalog_sales?select=buyer_id,payment_method,sale_price,created_date&kind=eq.loja&status=eq.paid&buyer_id=in.(${idsParam})&order=created_date.asc`);

    // 4) Comissões pagas/confirmadas
    const commissions = await sbFetch(`commission_records?select=user_id,user_name,amount,status,sale_id,role&user_id=in.(${idsParam})&order=created_date.asc`);

    // 5) Histórico de lance (bid_hold / bid_release / auction_settlement / auction_refund)
    const bidHistory = await sbFetch(`digital_wallet_transactions?select=user_id,type,direction,amount,status,related_auction_id,description,created_date&user_id=in.(${idsParam})&type=in.(bid_hold,bid_release,auction_settlement,auction_refund)&order=created_date.asc`);

    // --- Cálculo por usuário ---
    const byUser: Record<string, any> = {};
    for (const id of user_ids) {
      byUser[id] = {
        user_id: id,
        deposits_paid: [] as any[],
        deposits_total: 0,
        commissions: [] as any[],
        commissions_total: 0,
        bid_events: [] as any[],
        bid_holds_total: 0,
        bid_releases_total: 0,
        orphan_holds_total: 0, // holds sem release/settlement compensando
        current_balance: null as any,
      };
    }

    if (currentBalances.status === 200 && Array.isArray(currentBalances.body)) {
      for (const row of currentBalances.body) {
        if (byUser[row.id]) byUser[row.id].current_balance = { saldo_disponivel: row.saldo_disponivel, saldo_alocado: row.saldo_alocado, full_name: row.full_name };
      }
    }

    if (deposits.status === 200 && Array.isArray(deposits.body)) {
      for (const row of deposits.body) {
        if (!byUser[row.buyer_id]) continue;
        byUser[row.buyer_id].deposits_paid.push({ valor: row.sale_price, mp_payment_id: row.mp_payment_id, data: (row.created_date || '').slice(0, 10) });
        byUser[row.buyer_id].deposits_total = money(byUser[row.buyer_id].deposits_total + Number(row.sale_price || 0));
      }
    }

    if (commissions.status === 200 && Array.isArray(commissions.body)) {
      for (const row of commissions.body) {
        if (!byUser[row.user_id]) continue;
        if (row.status !== 'paid' && row.status !== 'confirmed') continue;
        byUser[row.user_id].commissions.push({ valor: row.amount, role: row.role, sale_id: row.sale_id, status: row.status });
        byUser[row.user_id].commissions_total = money(byUser[row.user_id].commissions_total + Number(row.amount || 0));
      }
    }

    // Holds órfãos: soma holds (débito) menos releases/settlements/refunds (crédito de volta) por leilão
    if (bidHistory.status === 200 && Array.isArray(bidHistory.body)) {
      const byUserAuction: Record<string, Record<string, number>> = {};
      for (const row of bidHistory.body) {
        if (!byUser[row.user_id]) continue;
        byUser[row.user_id].bid_events.push({
          type: row.type, direction: row.direction, valor: row.amount, status: row.status,
          leilao_id: row.related_auction_id, data: (row.created_date || '').slice(0, 10),
        });
        const key = row.related_auction_id || 'sem_leilao';
        byUserAuction[row.user_id] = byUserAuction[row.user_id] || {};
        byUserAuction[row.user_id][key] = byUserAuction[row.user_id][key] || 0;
        const sign = row.direction === 'debit' ? -1 : 1;
        byUserAuction[row.user_id][key] += sign * Number(row.amount || 0);
        if (row.type === 'bid_hold') byUser[row.user_id].bid_holds_total = money(byUser[row.user_id].bid_holds_total + Number(row.amount || 0));
        if (row.type === 'bid_release' || row.type === 'auction_refund') byUser[row.user_id].bid_releases_total = money(byUser[row.user_id].bid_releases_total + Number(row.amount || 0));
      }
      for (const uid of Object.keys(byUserAuction)) {
        let orphan = 0;
        for (const auctionId of Object.keys(byUserAuction[uid])) {
          const net = byUserAuction[uid][auctionId]; // negativo = ainda preso (hold sem release/settlement)
          if (net < 0) orphan += Math.abs(net);
        }
        byUser[uid].orphan_holds_total = money(orphan);
      }
    }

    // Saldo calculado = depósitos + comissões - holds órfãos (compras de catálogo NÃO entram — são pagas via gateway externo, não debitam saldo da carteira, exceto se payment_method indicar 'saldo'/'wallet')
    const result = user_ids.map((id: string) => {
      const u = byUser[id];
      const saldo_calculado = money(u.deposits_total + u.commissions_total - u.orphan_holds_total);
      const saldo_atual = u.current_balance ? Number(u.current_balance.saldo_disponivel) : null;
      return {
        user_id: id,
        nome: u.current_balance?.full_name || null,
        saldo_atual_banco: saldo_atual,
        saldo_alocado_atual: u.current_balance?.saldo_alocado ?? null,
        deposits_total: u.deposits_total,
        deposits_detalhe: u.deposits_paid,
        commissions_total: u.commissions_total,
        commissions_detalhe: u.commissions,
        bid_holds_total: u.bid_holds_total,
        bid_releases_total: u.bid_releases_total,
        orphan_holds_total: u.orphan_holds_total,
        bid_events_detalhe: u.bid_events,
        saldo_calculado,
        diferenca: saldo_atual !== null ? money(saldo_calculado - saldo_atual) : null,
      };
    });

    // Resumo de payment_method usado nas compras 'loja' pagas (pra saber se debitam saldo da carteira)
    const paymentMethodBreakdown: Record<string, number> = {};
    if (purchases.status === 200 && Array.isArray(purchases.body)) {
      for (const row of purchases.body) {
        const pm = row.payment_method || 'null';
        paymentMethodBreakdown[pm] = (paymentMethodBreakdown[pm] || 0) + 1;
      }
    }

    // Resumo apenas com os totais (sem detalhamento linha-a-linha) — evita resposta gigante
    const resultSummary = result.map((r: any) => ({
      user_id: r.user_id,
      nome: r.nome,
      saldo_atual_banco: r.saldo_atual_banco,
      saldo_alocado_atual: r.saldo_alocado_atual,
      deposits_total: r.deposits_total,
      deposits_count: r.deposits_detalhe.length,
      commissions_total: r.commissions_total,
      commissions_count: r.commissions_detalhe.length,
      bid_holds_total: r.bid_holds_total,
      bid_releases_total: r.bid_releases_total,
      orphan_holds_total: r.orphan_holds_total,
      saldo_calculado: r.saldo_calculado,
      diferenca: r.diferenca,
    }));

    return Response.json({
      loja_paid_payment_method_breakdown: paymentMethodBreakdown,
      resultado: resultSummary,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});