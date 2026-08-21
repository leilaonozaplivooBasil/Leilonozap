// createStoreOrder — pedido ONLINE da vitrine de uma loja da rede (/loja/:slug).
// Público (comprador anônimo). Valida itens contra o store_inventory da loja, cria a venda
// (kind='loja', seller_id = dono da loja) e gera PIX ou Cartão — os dois via Mercado Pago.
// O estoque só é baixado e a comissão só é paga QUANDO o pagamento confirma (mpWebhook).
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
// 🚚 PONTO 82 — frete RECOTADO no servidor (mesmo motor antifraude da Loja Virtual).
// O navegador só manda o ID da transportadora + CEP; o valor é apurado aqui.
// ⚠️ O frete NÃO entra em sale_price/total_amount: essa é a base de comissão.
import { resolverFreteDoCheckout } from '../_lib/frete.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilaonozap.net';
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

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
    const slug = String(body?.slug || '').trim().toLowerCase();
    const items = Array.isArray(body?.items) ? body.items : [];
    const customer = body?.customer || {};
    const gateway = body?.gateway === 'card' ? 'card' : 'pix';
    if (!slug || !items.length) return res.status(400).json({ success: false, error: 'Loja e itens são obrigatórios' });
    if (!customer.name || !customer.phone) return res.status(400).json({ success: false, error: 'Nome e WhatsApp são obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // resolve a loja pelo slug
    const sArr = await (await sb(`app_users?select=id,full_name,store_name,phone,primary_career_level&store_slug=eq.${encodeURIComponent(slug)}&limit=1`)).json();
    const store = Array.isArray(sArr) ? sArr[0] : null;
    if (!store) return res.status(404).json({ success: false, error: 'Loja não encontrada' });
    const storeName = store.store_name || store.full_name || 'Loja';

    // valida itens contra o estoque DA LOJA (preço e quantidade próprios)
    const ids = [...new Set(items.map((i) => String(i.product_id)).filter(Boolean))];
    if (!ids.length) return res.status(400).json({ success: false, error: 'Itens inválidos' });
    const inList = ids.map((i) => `"${encodeURIComponent(i)}"`).join(',');
    const si = await (await sb(`store_inventory?select=product_id,quantity,price,active&owner_id=eq.${encodeURIComponent(store.id)}&product_id=in.(${inList})`)).json();
    const siMap = {}; (Array.isArray(si) ? si : []).forEach((s) => { siMap[String(s.product_id)] = s; });
    const prods = await (await sb(`products?select=id,description&id=in.(${inList})`)).json();
    const pmap = {}; (Array.isArray(prods) ? prods : []).forEach((p) => { pmap[String(p.id)] = p; });

    let total = 0, totalQty = 0; const lines = [];
    for (const it of items) {
      const pid = String(it.product_id);
      const s = siMap[pid]; const p = pmap[pid];
      if (!s || !p) return res.status(200).json({ success: false, error: 'Um produto saiu da loja. Atualize a página.' });
      const qty = Math.max(1, Number(it.quantity) || 1);
      if (s.active === false || (Number(s.quantity) || 0) < qty) {
        return res.status(200).json({ success: false, error: `Estoque insuficiente de "${(p.description || '').slice(0, 40)}".` });
      }
      const unit = round2(s.price || 0);
      total += unit * qty; totalQty += qty;
      lines.push({ product_id: pid, title: (p.description || '').slice(0, 200), qty, unit });
    }
    if (!lines.length) return res.status(400).json({ success: false, error: 'Nenhum produto válido' });
    total = round2(total);
    if (total <= 0) return res.status(400).json({ success: false, error: 'Total inválido' });

    // 🚚 PONTO 82 — FRETE. Antes o CEP era coletado e ignorado: toda entrega saía com
    // frete pago pela casa. Agora o servidor RECOTA (mesmo motor da Loja Virtual) e recusa
    // o pedido se a opção escolhida não existir mais — nunca cobra frete zero calado.
    // 'pickup' = retirada na loja (zero explícito). Qualquer outro valor = entrega.
    const fr = await resolverFreteDoCheckout({
      delivery_type: body?.delivery_type === 'pickup' ? 'pickup' : 'delivery',
      cep: body?.cep || customer.cep,
      items,
      frete_id: body?.frete_id,
    });
    if (!fr.ok) return res.status(200).json({ success: false, error: fr.error });
    const frete = fr.frete;
    // 🔴 total (produtos) = base da comissão. totalCobrado = o que o cliente paga.
    const totalCobrado = round2(total + (Number(frete.valor) || 0));

    const saleId = oid();
    const title = lines.length === 1 ? lines[0].title : `${lines[0].title} +${lines.length - 1} item(ns)`;
    const tracking = 'LJ' + saleId.slice(0, 8).toUpperCase();
    const base = {
      id: saleId, base44_id: saleId, kind: 'loja', source: 'loja_online',
      seller_id: store.id, store_slug: slug,
      buyer_name: customer.name, buyer_email: customer.email || null, buyer_phone: customer.phone,
      buyer_address: customer.address || null, buyer_cep: frete.cep || customer.cep || null,
      // frete fica FORA de sale_price/total_amount (base de comissão) — igual createMPPix
      raw_base44: { delivery_type: body?.delivery_type === 'pickup' ? 'pickup' : 'delivery', frete, amount_charged: totalCobrado },
      product_title: String(title).slice(0, 300), sale_price: total, total_amount: total, quantity: totalQty,
      items_json: lines, status: 'pending_payment', tracking_code: tracking,
      payment_method: gateway === 'card' ? 'credit_card_mp' : 'pix_mp', created_date: new Date().toISOString(),
    };
    // grava (resiliente: se alguma coluna extra não existir, cai pro mínimo)
    let r = await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(base) });
    if (!r.ok) {
      const minimal = { id: saleId, base44_id: saleId, kind: 'loja', source: 'loja_online', seller_id: store.id, buyer_name: customer.name, buyer_phone: customer.phone, product_title: base.product_title, sale_price: total, total_amount: total, quantity: totalQty, items_json: lines, status: 'pending_payment', payment_method: base.payment_method };
      r = await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(minimal) });
      if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: 'Falha ao registrar pedido', details: t.slice(0, 200) }); }
    }

    if (gateway === 'pix') {
      if (!MP_TOKEN) return res.status(500).json({ success: false, error: 'PIX indisponível no momento' });
      const [first, ...rest] = String(customer.name).trim().split(/\s+/);
      const mp = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST', headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': saleId },
        body: JSON.stringify({
          transaction_amount: totalCobrado, // produtos + frete recotado no servidor
          description: `Pedido ${storeName} - Leilão NoZap`.slice(0, 200),
          payment_method_id: 'pix', notification_url: `${BASE_URL}/api/functions/mpWebhook`, external_reference: saleId,
          payer: { email: customer.email || 'comprador@leilaonozap.net', first_name: first || 'Cliente', last_name: rest.join(' ') || 'NoZap', ...(customer.cpf ? { identification: { type: 'CPF', number: String(customer.cpf).replace(/\D/g, '') } } : {}) },
        }),
      });
      const pay = await mp.json();
      if (!mp.ok || !pay?.id) return res.status(200).json({ success: false, error: 'Falha ao gerar PIX', details: (pay?.message || '').slice(0, 200) });
      const td = pay.point_of_interaction?.transaction_data || {};
      await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ mp_payment_id: String(pay.id), pix_qr: td.qr_code, pix_qr_base64: td.qr_code_base64, pix_ticket_url: td.ticket_url }) });
      return res.status(200).json({ success: true, gateway: 'pix', sale_id: saleId, amount: totalCobrado, amount_products: total, shipping: round2(frete.valor || 0), shipping_carrier: [frete.empresa, frete.servico].filter(Boolean).join(' ') || null, tracking, payment_id: String(pay.id), pix_code: td.qr_code, qr_code_base64: td.qr_code_base64, ticket_url: td.ticket_url });
    }

    // 💳 Cartão via Mercado Pago Checkout Pro (página hospedada) — substitui a antiga Stripe.
    if (!MP_TOKEN) return res.status(500).json({ success: false, error: 'Cartão indisponível no momento' });
    const [cFirst, ...cRest] = String(customer.name).trim().split(/\s+/);
    const prefBody = {
      items: [
        ...lines.map((ln) => ({ title: ln.title || 'Produto', quantity: ln.qty, unit_price: ln.unit, currency_id: 'BRL' })),
        // frete como linha própria e visível no checkout do MP (não some dentro do produto)
        ...(Number(frete.valor) > 0
          ? [{ title: `Frete - ${[frete.empresa, frete.servico].filter(Boolean).join(' ') || 'Entrega'}`.slice(0, 200), quantity: 1, unit_price: round2(frete.valor), currency_id: 'BRL' }]
          : []),
      ],
      // 🔴 PONTO 124 (21/08/2026): payer sem CPF — o ramo PIX logo acima (linha 116)
      // já manda `identification`, este de cartão ficou sem. Ver createMPCatalogCardCheckout.js.
      payer: { email: customer.email || 'comprador@leilaonozap.net', name: cFirst || 'Cliente', surname: cRest.join(' ') || 'NoZap', ...(customer.cpf ? { identification: { type: 'CPF', number: String(customer.cpf).replace(/\D/g, '') } } : {}) },
      external_reference: saleId,
      notification_url: `${BASE_URL}/api/functions/mpWebhook`,
      back_urls: { success: `${BASE_URL}/loja/${slug}?pago=${tracking}`, failure: `${BASE_URL}/loja/${slug}`, pending: `${BASE_URL}/loja/${slug}` },
      auto_return: 'approved',
      payment_methods: {
        excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'bank_transfer' }, { id: 'debit_card' }, { id: 'digital_wallet' }],
        installments: 12,
      },
    };
    const sr = await fetch('https://api.mercadopago.com/checkout/preferences', { method: 'POST', headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(prefBody) });
    const pref = await sr.json();
    if (!sr.ok || !pref?.id) return res.status(200).json({ success: false, error: 'Falha ao criar checkout', details: (pref?.message || JSON.stringify(pref)).slice(0, 200) });
    await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ mp_preference_id: pref.id }) });
    return res.status(200).json({ success: true, gateway: 'card', sale_id: saleId, amount: totalCobrado, amount_products: total, shipping: round2(frete.valor || 0), tracking, url: pref.init_point });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao criar pedido', details: String(e?.message || e) });
  }
}