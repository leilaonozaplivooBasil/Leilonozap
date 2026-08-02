// mpWebhook — recebe notificação do Mercado Pago, CONFIRMA o pagamento buscando-o na API do MP
// (não confia no corpo), marca a venda como paga e PAGA as comissões pela cadeia (telescópio, teto 20%).
// Idempotente: se a venda já está paga, não repaga.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
import { fulfillStoreOrder } from '../_lib/storeFulfill.js';
import { debitarCupomDaVenda } from '../_lib/passaporteCoupon.js';
import { creditarBonusPassaporte } from '../_lib/passaporteBonus.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const round2 = (n) => Math.round(n * 100) / 100;

// Depósito na carteira: credita saldo de forma atômica (CAS). NÃO paga comissão nem cumpre pedido — é só recarga.
// Chamado só depois do flip atômico (execução única por venda). A coluna depende da carteira-destino:
//   wallet_deposit -> saldo_disponivel (carteira digital, usada em arremate/lance)
//   commission_deposit -> commission_balance (carteira de comissões, usada no 'Pagar com saldo' da loja)
async function creditWalletDeposit(sale) {
  const col = sale.kind === 'commission_deposit' ? 'commission_balance' : 'saldo_disponivel';
  const amount = round2(Number(sale.total_amount || sale.sale_price) || 0);
  if (!sale.buyer_id || amount <= 0) return { credited: 0, skipped: true };
  for (let attempt = 0; attempt < 6; attempt++) {
    const rows = await (await sb(`app_users?select=${col}&id=eq.${encodeURIComponent(sale.buyer_id)}&limit=1`)).json();
    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user) return { credited: 0, error: 'buyer_notfound' };
    const current = round2(Number(user[col]) || 0);
    const novo = round2(current + amount);
    // 🔒 CORREÇÃO PONTO 71: coluna nunca inicializada fica NULL no banco, e "col=eq.0"
    // nunca combina com NULL (NULL = 0 não é verdadeiro no Postgres) — o crédito falhava
    // pra sempre em silêncio pra todo usuário novo. Se current é 0, aceita NULL também.
    const casFilter = current === 0 ? `or=(${col}.eq.0,${col}.is.null)` : `${col}=eq.${current}`;
    const patch = await sb(`app_users?id=eq.${encodeURIComponent(sale.buyer_id)}&${casFilter}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ [col]: novo }),
    });
    const updated = await patch.json().catch(() => []);
    if (Array.isArray(updated) && updated.length) return { credited: amount, wallet: col, new_balance: novo };
  }
  return { credited: 0, error: 'cas_conflict' };
}

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

// Ativa o Plano de Parceiro (Lucre Conosco/InvestorDashboard): cria o registro em
// partner_plan_purchases com o mesmo formato usado pela ativação manual (PartnerPlanActivation.jsx).
async function activatePartnerPlan(sale) {
  const id = oid();
  const activatedAt = new Date().toISOString();
  const start = new Date();
  const schedule = [1, 2, 3].map((i) => {
    const d = new Date(start); d.setDate(d.getDate() + i * 15);
    return { period: i, date: d.toISOString(), status: 'scheduled' };
  });
  await sb('partner_plan_purchases', {
    method: 'POST', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      id, base44_id: id,
      user_id: sale.buyer_id, user_name: sale.buyer_name, user_email: sale.buyer_email,
      plan_name: sale.product_title, plan_amount: round2(Number(sale.total_amount) || 0),
      activated_at: activatedAt, status: 'active',
      purchase_periods: schedule, activation_source: 'lucre_conosco',
    }),
  });
  return { partner_plan_activated: true, plan_name: sale.product_title, plan_amount: sale.total_amount };
}

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
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

    if (sale.kind === 'passaporte') {
      // Passaporte de Lances (modelo A): credita o valor pago + 10% de bônus NA HORA.
      // Sem acessos e sem validade — o crédito fica na carteira até ser usado.
      const r = await creditWalletDeposit({ ...sale, kind: 'wallet_deposit' });
      try {
        await sb('passaportes', {
          method: 'POST', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            user_id: sale.buyer_id, sale_id: sale.id, valor: round2(Number(sale.total_amount) || 0),
            status: 'ativo',
          }),
        });
      } catch (_) { /* crédito já entrou; registro do passaporte é secundário */ }
      // 🎟️ Bônus de 10% creditado na carteira (recolhido se o usuário arrematar)
      const bonus = await creditarBonusPassaporte(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, passaporte: true, ...r, bonus });
    }
    if (sale.kind === 'wallet_deposit' || sale.kind === 'commission_deposit') {
      // recarga de carteira: credita saldo e para aqui (sem fulfillment, sem comissão)
      const r = await creditWalletDeposit(sale);
      // 🎟️ Bônus de 10% também no aporte de carteira (>= R$ 100), creditado na hora
      const bonus = sale.kind === 'wallet_deposit' ? await creditarBonusPassaporte(sale) : null;
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, deposit: true, ...r, bonus });
    }
    if (sale.kind === 'adesao') {
      const r = await activateAdesao(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, ...r });
    }
    if (sale.kind === 'partner_plan') {
      const r = await activatePartnerPlan(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, ...r });
    }
    if (sale.kind === 'loja') {
      const r = await fulfillStoreOrder(sale);
      // 🎟️ só agora (pagamento confirmado) o crédito do Cupom Passaporte é debitado
      const cupom = await debitarCupomDaVenda(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, ...r, cupom });
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