// mpWebhook — recebe notificação do Mercado Pago, CONFIRMA o pagamento buscando-o na API do MP
// (não confia no corpo), marca a venda como paga e PAGA as comissões pela cadeia (telescópio, teto 20%).
// Idempotente: se a venda já está paga, não repaga.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
import { fulfillStoreOrder } from '../_lib/storeFulfill.js';
import { gerarEnvioAutomatico } from '../_lib/melhorEnvioShipment.js';
import { settlePdvPixSale } from '../_lib/pdvSettle.js';
// 🏪 Reposição de estoque do lojista (compra firme): entra estoque, não paga comissão.
import { aplicarReposicao } from '../_lib/supplySettle.js';
import { debitarCupomDaVenda, criarCupomPassaporte } from '../_lib/passaporteCoupon.js';
import { payDirectCommissions } from '../_lib/commissions.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const round2 = (n) => Math.round(n * 100) / 100;

// Depósito na carteira: credita saldo de forma atômica (CAS). NÃO paga comissão nem cumpre pedido — é só recarga.
// Chamado só depois do flip atômico (execução única por venda). A coluna depende da carteira-destino:
//   wallet_deposit -> saldo_disponivel (carteira digital, usada em arremate/lance)
//   commission_deposit -> commission_balance (carteira de comissões, usada no 'Pagar com saldo' da loja)
async function creditWalletDeposit(sale) {
  // 💵 operacao_deposit → saldo_operacao: dinheiro recebido do cliente na rua,
  // usado para pagar pedidos. Não sacável (só mercadoria ou transferência).
  const col = sale.kind === 'commission_deposit' ? 'commission_balance'
    : sale.kind === 'operacao_deposit' ? 'saldo_operacao'
    : 'saldo_disponivel';
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

// Adesão de Vendedor (primeira compra R$1.497): credita seller_credit_balance de forma
// atômica (CAS) — o vendedor usa esse crédito pra escolher produtos na Loja Virtual. Além
// disso, paga comissão pra cadeia de quem indicou o comprador (referred_by_id), reaproveitando
// o mesmo motor telescópico/teto 20% já usado nas vendas da loja (payDirectCommissions).
async function creditSellerAdhesion(sale) {
  const amount = round2(Number(sale.total_amount || sale.sale_price) || 0);
  if (!sale.buyer_id || amount <= 0) return { credited: 0, skipped: true };
  let referredById = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const rows = await (await sb(`app_users?select=seller_credit_balance,referred_by_id&id=eq.${encodeURIComponent(sale.buyer_id)}&limit=1`)).json();
    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user) return { credited: 0, error: 'buyer_notfound' };
    referredById = user.referred_by_id || null;
    const current = round2(Number(user.seller_credit_balance) || 0);
    const novo = round2(current + amount);
    const casFilter = current === 0 ? `or=(seller_credit_balance.eq.0,seller_credit_balance.is.null)` : `seller_credit_balance=eq.${current}`;
    const patch = await sb(`app_users?id=eq.${encodeURIComponent(sale.buyer_id)}&${casFilter}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ seller_credit_balance: novo }),
    });
    const updated = await patch.json().catch(() => []);
    if (Array.isArray(updated) && updated.length) {
      // 💰 comissão pra quem indicou (best-effort — erro aqui não desfaz o crédito já dado)
      const commission = referredById ? await payDirectCommissions({ saleId: sale.id, sellerId: referredById, total: amount }) : 0;
      return { credited: amount, new_balance: novo, commission };
    }
  }
  return { credited: 0, error: 'cas_conflict' };
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

    // ══════════════════════════════════════════════════════════════════════════
    // 🔴 PONTO 102 (21/08/2026) — CHARGEBACK ERA DESCARTADO EM SILÊNCIO
    // ══════════════════════════════════════════════════════════════════════════
    // Esta linha era só `if (pay.status !== 'approved') return { ok: true }`.
    // Qualquer status que não fosse 'approved' caía fora sem nada acontecer —
    // inclusive os que significam DINHEIRO INDO EMBORA:
    //
    //   charged_back  o comprador contestou no cartão e o banco estornou
    //   refunded      devolução total
    //   cancelled     pagamento cancelado depois de aprovado
    //
    // O estrago: a venda já tinha sido cumprida quando o pagamento aprovou —
    // estoque baixado, comissão de 30% creditada e sacável, escrow do vendedor
    // contando os 7 dias. Aí o dinheiro voltava pro comprador e o sistema
    // respondia "ok" pro Mercado Pago e seguia a vida. Ninguém era avisado.
    // A rede sacava a comissão de uma venda que foi estornada, e o prejuízo
    // aparecia só na conciliação bancária, semanas depois.
    //
    // Agora esses três statuses caem no MESMO cancelar_venda() que o
    // cancelamento manual usa (migração 20260821_cancelamento_estorna.sql):
    // prende o escrow, estorna a comissão já creditada e reporta o que não deu
    // pra recuperar de quem já sacou. Função atômica e idempotente — webhook do
    // MP dispara várias vezes e chamar de novo não estorna em dobro.
    //
    // ⚠️ 'in_mediation' (disputa aberta, dinheiro ainda não devolvido) NÃO entra
    // aqui de propósito: estornar comissão de uma disputa que a loja pode ganhar
    // puniria a rede à toa. Só registra alto no log pro humano acompanhar.
    const ESTORNADOS = ['charged_back', 'refunded', 'cancelled', 'canceled'];
    if (ESTORNADOS.includes(String(pay.status))) {
      const idVenda = pay.external_reference;
      console.error(`[MP] ESTORNO RECEBIDO (${pay.status}) — pagamento ${pay.id}, venda ${idVenda}. Desfazendo comissão e escrow.`);
      if (!idVenda) return res.status(200).json({ ok: true, status: pay.status, sem_referencia: true });
      // 🔴 PONTO 107 (21/08/2026) — `_devolver_ao_comprador: false`, EXPLÍCITO.
      // O valor já é o padrão da função, mas está escrito aqui de propósito pra
      // ninguém "consertar" isso por engano depois.
      //
      // No chargeback/refund o dinheiro JÁ VOLTOU pro comprador pelo cartão ou
      // pelo Mercado Pago. Se creditássemos a carteira também, a empresa perderia
      // a venda E daria saldo de presente — pagaria duas vezes pelo mesmo
      // estorno. Aqui só desfazemos a comissão e o escrow.
      //
      // Quem devolve é o cancelamento ADMINISTRATIVO (updateOrderStatus.js), onde
      // a empresa ficou com o dinheiro e precisa entregar de volta.
      const rpc = await sb('rpc/cancelar_venda', {
        method: 'POST',
        body: JSON.stringify({
          _sale_id: String(idVenda),
          _motivo: `Mercado Pago: ${pay.status} (pagamento ${pay.id})`,
          _devolver_ao_comprador: false,
        }),
      });
      if (!rpc.ok) {
        const t = await rpc.text();
        console.error(`[MP] FALHA AO ESTORNAR a venda ${idVenda} — resolver na mão: ${t.slice(0, 200)}`);
        return res.status(200).json({ ok: false, status: pay.status, estorno_falhou: true });
      }
      const estorno = await rpc.json().catch(() => null);
      console.error(`[MP] Estorno aplicado na venda ${idVenda}: ${JSON.stringify(estorno)}`);
      return res.status(200).json({ ok: true, status: pay.status, estornado: true, estorno });
    }
    if (String(pay.status) === 'in_mediation') {
      console.error(`[MP] DISPUTA ABERTA — pagamento ${pay.id}, venda ${pay.external_reference}. Nada foi estornado ainda; acompanhar.`);
      return res.status(200).json({ ok: true, status: pay.status, em_disputa: true });
    }

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

    // 🏪 PDV (balcão) pago com PIX real: só AGORA baixa estoque e paga comissão
    if (sale.source === 'pdv') {
      const r = await settlePdvPixSale(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, ...r });
    }
    // 🏪 REPOSIÇÃO DE ESTOQUE (compra firme do lojista): a mercadoria só sai do
    // estoque central e entra no estoque da loja agora, com o dinheiro confirmado.
    // Abastecimento NÃO é venda ao consumidor: nenhuma comissão é paga aqui.
    if (sale.kind === 'reposicao') {
      const r = await aplicarReposicao(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, reposicao: true, ...r });
    }
    if (sale.kind === 'passaporte') {
      // Passaporte de Lances — REGRA OFICIAL (restaurada 19/08/2026, autorizado pelo
      // dono): o valor pago vira saldo de lance normal; o bônus de 10% nasce como
      // CUPOM BLOQUEADO (à parte, nunca soma no saldo de lance). Só libera pra usar
      // na Loja Virtual se o leilão terminar e o usuário NÃO arrematar; se arrematar,
      // o cupom é cancelado (ver finalizeAuctionCore.js).
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
      // 🎟️ Cupom de 10% nasce BLOQUEADO — nunca entra no saldo de lance.
      const bonus = await criarCupomPassaporte(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, passaporte: true, ...r, bonus });
    }
    if (sale.kind === 'operacao_deposit') {
      // 💵 saldo de operação: só credita. Sem comissão, sem bônus, sem estoque.
      const r = await creditWalletDeposit(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, operacao: true, ...r });
    }
    if (sale.kind === 'wallet_deposit' || sale.kind === 'commission_deposit') {
      // recarga de carteira: credita saldo e para aqui (sem fulfillment, sem comissão)
      const r = await creditWalletDeposit(sale);
      // 🎟️ Cupom de 10% também no aporte de carteira (>= R$ 100) — bloqueado, à
      // parte do saldo de lance (mesma regra do passaporte, ver comentário acima).
      const bonus = sale.kind === 'wallet_deposit' ? await criarCupomPassaporte(sale) : null;
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, deposit: true, ...r, bonus });
    }
    if (sale.kind === 'adesao') {
      const r = await activateAdesao(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, ...r });
    }
    if (sale.kind === 'seller_adhesion') {
      const r = await creditSellerAdhesion(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, seller_adhesion: true, ...r });
    }
    if (sale.kind === 'partner_plan') {
      const r = await activatePartnerPlan(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, ...r });
    }
    if (sale.kind === 'seller_freight') {
      // Frete da Etapa 2 do "Seja Vendedor": o flip acima já marcou como 'paid'.
      // Sem fulfillment/comissão — a página só espera esse status pra liberar "Fechar pedido".
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, freight: true });
    }
    if (sale.kind === 'loja') {
      const r = await fulfillStoreOrder(sale);
      // 🎟️ só agora (pagamento confirmado) o crédito do Cupom Passaporte é debitado
      const cupom = await debitarCupomDaVenda(sale);
      // 🚚 Frete automático: adiciona ao carrinho e compra a etiqueta na Melhor Envio.
      // Best-effort — nunca bloqueia a venda já paga/comissionada acima.
      const envio = await gerarEnvioAutomatico(sale);
      return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, ...r, cupom, envio });
    }
    // 💰 PLANO DIRETOR também para venda de produto (antes usava o motor velho, que não
    // pagava NADA ao bloco diretor). fulfillStoreOrder aplica a mesma regra de 26%.
    const rr = await fulfillStoreOrder(sale);
    const commission = rr?.commission ?? 0;
    await sb(`catalog_sales?id=eq.${sale.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_total: commission }) });
    const envio2 = await gerarEnvioAutomatico(sale);
    return res.status(200).json({ ok: true, paid: true, sale_id: sale.id, commission, envio: envio2 });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
}