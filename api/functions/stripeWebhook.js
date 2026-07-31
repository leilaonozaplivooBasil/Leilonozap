// stripeWebhook — confirma o pagamento de cartão (busca a sessão/PI na API da Stripe, não confia
// no corpo), marca a venda paga (idempotente) e paga as comissões pela cadeia (telescópio teto 20%).
import { computeTopPool } from '../_lib/topPool.js';
import { bestSellingLevel, overridePct } from '../_lib/networkChain.js';
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
import { fulfillStoreOrder } from '../_lib/storeFulfill.js';
import { debitarCupomDaVenda } from '../_lib/passaporteCoupon.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const round2 = (n) => Math.round(n * 100) / 100;

async function activateAdesao(sale) {
  const u = await (await sb(`app_users?select=career_levels&id=eq.${encodeURIComponent(sale.buyer_id)}&limit=1`)).json();
  const buyer = Array.isArray(u) ? u[0] : null;
  const levels = Array.isArray(buyer?.career_levels) ? buyer.career_levels.slice() : [];
  if (!levels.includes(sale.adesao_level)) levels.push(sale.adesao_level);
  await sb(`app_users?id=eq.${sale.buyer_id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ career_levels: levels, primary_career_level: sale.adesao_level }) });
  await sb('adesao_orders', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: oid(), sale_id: sale.id, user_id: sale.buyer_id, user_name: sale.buyer_name, user_email: sale.buyer_email, adesao_level: sale.adesao_level, valor_produto: sale.total_amount, status: 'a_escolher' }) });
  let bonus = 0;
  if (sale.seller_id) {
    bonus = round2(0.20 * Number(sale.total_amount));
    const s = await (await sb(`app_users?select=full_name,primary_career_level,commission_balance&id=eq.${encodeURIComponent(sale.seller_id)}&limit=1`)).json();
    const seller = Array.isArray(s) ? s[0] : null;
    if (seller) {
      await sb('commission_ledger', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ sale_id: sale.id, beneficiary_id: sale.seller_id, beneficiary_name: seller.full_name, beneficiary_level: seller.primary_career_level, role_in_sale: 'bonus_adesao', pct: 20, amount: bonus }) });
      await sb(`app_users?id=eq.${sale.seller_id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_balance: round2((Number(seller.commission_balance) || 0) + bonus) }) });
    }
  }
  return { adesao: true, level: sale.adesao_level, product_credit: sale.total_amount, bonus };
}

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

async function payCommissions(sale) {
  const value = Number(sale.total_amount) || 0;
  if (!value || !sale.buyer_id) return 0;
  const levels = Object.fromEntries((await (await sb('career_levels?select=id,venda_direta_pct')).json()).map((l) => [l.id, l]));
  const ovRows = await (await sb('commission_overrides?select=earner_level,on_level,pct&condicao=eq.direto')).json();
  const ov = {}; ovRows.forEach((r) => { (ov[r.earner_level] = ov[r.earner_level] || {})[r.on_level] = r.pct; });
  const chain = [];
  let cur = await (await sb(`app_users?select=id,full_name,primary_career_level,referred_by_id&id=eq.${encodeURIComponent(sale.buyer_id)}&limit=1`)).json();
  let node = Array.isArray(cur) ? cur[0] : null;
  for (let i = 0; i < 10 && node && node.referred_by_id; i++) {
    const a = await (await sb(`app_users?select=id,full_name,primary_career_level,referred_by_id,commission_balance&id=eq.${encodeURIComponent(node.referred_by_id)}&limit=1`)).json();
    const anc = Array.isArray(a) ? a[0] : null; if (!anc) break;
    chain.push({ child: node, anc }); node = anc;
  }
  const cap = 0.20 * value; let running = 0; let total = 0;
  for (let i = 0; i < chain.length && running < cap - 0.001; i++) {
    const { child, anc } = chain[i];
    // usa o MELHOR cargo da pessoa, não só o principal — quem tem cargo
    // institucional como principal (Livoo Live, Embaixador…) recebia 0% aqui.
    const pct = i === 0 ? bestSellingLevel(anc, levels).pct : overridePct(ov, anc, child);
    let amount = round2(value * pct / 100); if (running + amount > cap) amount = round2(cap - running);
    if (amount > 0.001) {
      await sb('commission_ledger', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ sale_id: sale.id, beneficiary_id: anc.id, beneficiary_name: anc.full_name, beneficiary_level: anc.primary_career_level, role_in_sale: i === 0 ? 'venda_direta' : 'override', pct, amount }) });
      await sb(`app_users?id=eq.${anc.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_balance: round2((Number(anc.commission_balance) || 0) + amount) }) });
      running += amount; total += amount;
    }
  }

  // ---- TOPO DO PLANO (10%) — governança ----
  // A cadeia acima cobre os 20%. Este bloco paga os cargos institucionais (CEO,
  // Livoo Live, Embaixador, Conselheiros, Fundadores, Diretorias) e o 1% do Sócio
  // Executivo sobre a própria estrutura. Antes de 26/07/2026 essa fatia nunca era
  // distribuída — o dinheiro simplesmente não saía para eles.
  try {
    const todos = await (await sb('app_users?select=id,full_name,career_levels,primary_career_level,referred_by_id,commission_balance,licenciado_context,active&limit=5000')).json();
    const lista = Array.isArray(todos) ? todos : [];
    const ancora = sale.seller_id || (lista.find((u) => u.id === sale.buyer_id)?.referred_by_id ?? null);
    const linhasTopo = computeTopPool(value, lista, ancora);
    for (const l of linhasTopo) {
      await sb('commission_ledger', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ sale_id: sale.id, ...l }) });
      const alvo = lista.find((u) => u.id === l.beneficiary_id);
      await sb(`app_users?id=eq.${l.beneficiary_id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_balance: round2((Number(alvo?.commission_balance) || 0) + l.amount) }) });
      total += l.amount;
    }
  } catch (e) {
    console.error('[comissao] topo do plano falhou:', e?.message || e);
  }

  return round2(total);
}

export default async function handler(req, res) {
  try {
    if (!SUPABASE_URL || !SR || !STRIPE_KEY) return res.status(200).json({ ok: false, error: 'config' });
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const obj = body?.data?.object || {};
    const type = body?.type || '';
    // pega o id da sessão ou do payment_intent
    let sessionId = type.startsWith('checkout.session') ? obj.id : null;
    let saleId = obj?.metadata?.sale_id || obj?.client_reference_id || null;

    // confirma na API da Stripe (fonte de verdade)
    let paid = false;
    if (sessionId) {
      const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${STRIPE_KEY}` } });
      const s = await r.json();
      if (r.ok) { paid = s.payment_status === 'paid'; saleId = saleId || s.metadata?.sale_id || s.client_reference_id; }
    } else if (type.startsWith('payment_intent') && obj.id) {
      const r = await fetch(`https://api.stripe.com/v1/payment_intents/${obj.id}`, { headers: { Authorization: `Bearer ${STRIPE_KEY}` } });
      const pi = await r.json();
      if (r.ok) { paid = pi.status === 'succeeded'; saleId = saleId || pi.metadata?.sale_id; }
    }
    if (!paid) return res.status(200).json({ ok: true, status: 'not_paid' });

    const rows = await (await sb(`catalog_sales?select=*&${saleId ? `or=(id.eq.${saleId},stripe_session_id.eq.${sessionId})` : `stripe_session_id.eq.${sessionId}`}&limit=1`)).json();
    const sale = Array.isArray(rows) ? rows[0] : null;
    if (!sale) return res.status(200).json({ ok: true, sale_notfound: true });
    if (sale.status === 'paid') return res.status(200).json({ ok: true, already_paid: true });

    await sb(`catalog_sales?id=eq.${sale.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'paid' }) });
    if (sale.kind === 'adesao') {
      const r = await activateAdesao(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, ...r });
    }
    if (sale.kind === 'loja') {
      const r = await fulfillStoreOrder(sale);
      // 🎟️ crédito do Cupom Passaporte debitado só com o pagamento confirmado
      const cupom = await debitarCupomDaVenda(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, ...r, cupom });
    }
    const commission = await payCommissions(sale);
    await sb(`catalog_sales?id=eq.${sale.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_total: commission }) });
    return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, commission });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
}