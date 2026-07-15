// mpWebhook — recebe notificação do Mercado Pago, CONFIRMA o pagamento buscando-o na API do MP
// (não confia no corpo), marca a venda como paga e PAGA as comissões pela cadeia (telescópio, teto 20%).
// Idempotente: se a venda já está paga, não repaga.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
import { fulfillStoreOrder } from '../_lib/storeFulfill.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const round2 = (n) => Math.round(n * 100) / 100;

// Adesão de cargo: ativa o nível, gera pedido de produto (valor volta em produto) e paga 20% pro vendedor
async function activateAdesao(sale) {
  const u = await (await sb(`app_users?select=career_levels&id=eq.${encodeURIComponent(sale.buyer_id)}&limit=1`)).json();
  const buyer = Array.isArray(u) ? u[0] : null;
  const levels = Array.isArray(buyer?.career_levels) ? buyer.career_levels.slice() : [];
  if (!levels.includes(sale.adesao_level)) levels.push(sale.adesao_level);
  await sb(`app_users?id=eq.${sale.buyer_id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ career_levels: levels, primary_career_level: sale.adesao_level }) });
  // pedido de produto (crédito = valor da adesão)
  await sb('adesao_orders', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: oid(), sale_id: sale.id, user_id: sale.buyer_id, user_name: sale.buyer_name, user_email: sale.buyer_email, adesao_level: sale.adesao_level, valor_produto: sale.total_amount, status: 'a_escolher' }) });
  // 20% de adesão em dinheiro pro vendedor (quem indicou)
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

  // carrega a cadeia (até 10 níveis acima)
  const chain = [];
  let cur = await (await sb(`app_users?select=id,full_name,primary_career_level,referred_by_id&id=eq.${encodeURIComponent(sale.buyer_id)}&limit=1`)).json();
  let node = Array.isArray(cur) ? cur[0] : null;
  for (let i = 0; i < 10 && node && node.referred_by_id; i++) {
    const a = await (await sb(`app_users?select=id,full_name,primary_career_level,referred_by_id,commission_balance&id=eq.${encodeURIComponent(node.referred_by_id)}&limit=1`)).json();
    const anc = Array.isArray(a) ? a[0] : null;
    if (!anc) break;
    chain.push({ child: node, anc });
    node = anc;
  }

  const cap = 0.20 * value; let running = 0; let total = 0;
  for (let i = 0; i < chain.length && running < cap - 0.001; i++) {
    const { child, anc } = chain[i];
    const pct = i === 0 ? (levels[anc.primary_career_level]?.venda_direta_pct || 0) : ((ov[anc.primary_career_level] || {})[child.primary_career_level] || 0);
    let amount = round2(value * pct / 100);
    if (running + amount > cap) amount = round2(cap - running);
    if (amount > 0.001) {
      await sb('commission_ledger', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
        sale_id: sale.id, beneficiary_id: anc.id, beneficiary_name: anc.full_name, beneficiary_level: anc.primary_career_level,
        role_in_sale: i === 0 ? 'venda_direta' : 'override', pct, amount,
      }) });
      await sb(`app_users?id=eq.${anc.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_balance: round2((Number(anc.commission_balance) || 0) + amount) }) });
      running += amount; total += amount;
    }
  }
  return round2(total);
}

export default async function handler(req, res) {
  try {
    if (!SUPABASE_URL || !SR || !MP_TOKEN) return res.status(200).json({ ok: false, error: 'config' });
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    // o id do pagamento vem em data.id (body) ou ?data.id / ?id (query)
    const url = new URL(req.url, 'http://x');
    const payId = body?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id') || body?.id;
    if (!payId) return res.status(200).json({ ok: true, ignored: true });

    // BUSCA o pagamento real no MP (fonte de verdade — não confia no corpo do webhook)
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${payId}`, { headers: { Authorization: `Bearer ${MP_TOKEN}` } });
    const pay = await r.json();
    if (!r.ok || !pay?.id) return res.status(200).json({ ok: true, notfound: true });

    if (pay.status !== 'approved') return res.status(200).json({ ok: true, status: pay.status });

    const saleId = pay.external_reference;
    const rows = await (await sb(`catalog_sales?select=*&or=(id.eq.${saleId},mp_payment_id.eq.${pay.id})&limit=1`)).json();
    const sale = Array.isArray(rows) ? rows[0] : null;
    if (!sale) return res.status(200).json({ ok: true, sale_notfound: true });
    if (sale.status === 'paid') return res.status(200).json({ ok: true, already_paid: true }); // idempotência rápida

    // 🔒 FLIP ATÔMICO: o webhook do MP dispara VÁRIAS vezes. A checagem acima (ler-status →
    // marcar-paid) NÃO é atômica: dois webhooks liam 'pending' ao mesmo tempo, os dois passavam
    // e a comissão era paga EM DOBRO (aconteceu numa venda real). Aqui só flipa quem pegar a linha
    // AINDA em pending_payment; os outros recebem 0 linhas e param. Só quem flipou paga a comissão.
    const flip = await sb(`catalog_sales?id=eq.${sale.id}&status=eq.pending_payment`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'paid', mp_payment_id: String(pay.id) }),
    });
    const flipped = await flip.json().catch(() => []);
    if (!Array.isArray(flipped) || !flipped.length) {
      return res.status(200).json({ ok: true, already_paid: true, raced: true }); // outro webhook já pagou
    }

    if (sale.kind === 'adesao') {
      const r = await activateAdesao(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, ...r });
    }
    if (sale.kind === 'loja') {
      const r = await fulfillStoreOrder(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, ...r });
    }
    // 💰 PLANO DIRETOR também para venda de produto (antes usava o motor velho, que não
    // pagava NADA ao bloco diretor). fulfillStoreOrder aplica a mesma regra de 26%.
    const rr = await fulfillStoreOrder(sale);
    const commission = rr?.commission ?? 0;
    await sb(`catalog_sales?id=eq.${sale.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_total: commission }) });
    return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, commission });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
}
