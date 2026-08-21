// createMPCatalogCardCheckout — cartão via Mercado Pago Checkout Pro (página hospedada do MP),
// substitui o antigo createStripeCheckout.js. Mesma estrutura: cria a venda pending_payment
// (kind: 'loja') e devolve a URL do checkout do Mercado Pago pra redirecionar.
// Confirmação/comissão/estoque continuam 100% no mpWebhook.js (mesmo motor do PIX).
import { oid } from '../_lib/oid.js';
import { calcularDesconto } from '../_lib/passaporteCoupon.js';
import { resolverFreteDoCheckout } from '../_lib/frete.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilaonozap.net';
const round2 = (n) => Math.round(n * 100) / 100;

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
    const buyer = body?.buyer || {};
    const items = Array.isArray(body?.items) && body.items.length ? body.items : (body?.product_id ? [{ product_id: body.product_id, quantity: body.quantity || 1 }] : []);
    if (!buyer?.email || !items.length) return res.status(400).json({ success: false, error: 'Comprador e itens são obrigatórios' });
    if (!SUPABASE_URL || !SR || !MP_TOKEN) return res.status(500).json({ success: false, error: 'Config do servidor ausente (Mercado Pago/Supabase)' });

    const ids = items.map((i) => i.product_id).filter(Boolean);
    const prods = await (await sb(`products?select=id,description,price_catalog,selling_price_retail,image_urls&id=in.(${ids.map((x) => `"${x}"`).join(',')})`)).json();
    const pmap = Object.fromEntries((Array.isArray(prods) ? prods : []).map((p) => [p.id, p]));
    const unitPrice = (p) => (Number(p.price_catalog) > 0 ? Number(p.price_catalog) : Number(p.selling_price_retail) || 0);
    let total = 0; const lines = [];
    for (const it of items) { const p = pmap[it.product_id]; if (!p) continue; const q = Math.max(1, parseInt(it.quantity) || 1); total += unitPrice(p) * q; lines.push({ p, q }); }
    total = round2(total);
    if (total <= 0) return res.status(400).json({ success: false, error: 'Itens inválidos' });
    const main = lines[0].p;

    // 🥇 REGRA DE VENDA PESSOAL (absoluta, Santana 04/08/2026): quem tem cargo de rede é
    // SEMPRE o vendedor da própria compra — logado, deslogado, ou comprando pelo link de
    // outra pessoa. "Comprei na minha loja, automaticamente eu ganho." Vem ANTES do ref_code.
    // Trainee fica de fora: é papel de mentoria, sem percentual de venda direta.
    const CARGOS_REDE = [
      'influenciador', 'influencer', 'licenciado_aplicativo',
      'vendedor',
      'licenciado', 'licenciado_catalogo',
      'parceiro',
      'ponto_retirada',
      'loja_fisica',
      'distribuidor',
    ];
    let seller_id = null;
    if (buyer.id) {
      const me = await (await sb(`app_users?select=id,career_levels&id=eq.${encodeURIComponent(buyer.id)}&limit=1`)).json();
      const eu = Array.isArray(me) ? me[0] : null;
      const meusCargos = Array.isArray(eu?.career_levels) ? eu.career_levels : [];
      if (eu && meusCargos.some((c) => CARGOS_REDE.includes(c))) seller_id = eu.id;
    }
    const refCode = String(body?.ref_code || '').trim();
    if (!seller_id && refCode) { const r = await (await sb(`app_users?select=id&referral_code=eq.${encodeURIComponent(refCode)}&limit=1`)).json(); if (Array.isArray(r) && r[0]) seller_id = r[0].id; }
    if (!seller_id && buyer.id) { const b = await (await sb(`app_users?select=referred_by_id&id=eq.${encodeURIComponent(buyer.id)}&limit=1`)).json(); if (Array.isArray(b) && b[0]) seller_id = b[0].referred_by_id || null; }
    if (seller_id) {
      const ex = await (await sb(`app_users?select=id&id=eq.${encodeURIComponent(seller_id)}&limit=1`)).json();
      if (!Array.isArray(ex) || !ex.length) seller_id = null;
    }

    // 🎟️ Cupom Passaporte (crédito de 10% do aporte, somado entre todos os cupons
    // liberados do usuário) — validado no servidor. Débito real acontece em
    // debitarCupomDaVenda, no confirm do pagamento (FIFO por todos os cupons).
    let passaporte_desconto = 0;
    if (body?.use_passaporte === true && buyer?.id) {
      const abativel = round2(Math.max(0, total - 1));
      const pc = abativel > 0 ? await calcularDesconto(buyer.id, abativel) : null;
      if (pc) { passaporte_desconto = pc.desconto; }
    }
    const totalProdutos = round2(total - passaporte_desconto);

    // 🚚 frete recotado no servidor — totalProdutos (base da comissão) fica intacto.
    const addrS = body?.address || {};
    const fr = await resolverFreteDoCheckout({
      delivery_type: body?.delivery_type,
      cep: addrS?.zip || body?.cep,
      items,
      frete_id: body?.frete_id,
    });
    if (!fr.ok) return res.status(200).json({ success: false, error: fr.error });
    const frete = fr.frete;
    // 💳 TAXA DO CARTÃO REPASSADA AO CLIENTE (Gabriel, 04/08/2026): a loja não absorve
    // nada. Os juros do parcelamento já são cobrados do cliente pelo próprio MP; aqui
    // entra a taxa de venda que o MP descontava do recebimento. Fica FORA da base de
    // comissão (total_amount continua só o produto) — senão infla comissão de todo mundo.
    const TAXA_CARTAO_PCT = 5.31;
    const subtotal = round2(totalProdutos + frete.valor);
    const taxaCartao = round2(subtotal * (TAXA_CARTAO_PCT / 100));
    const totalCobrado = round2(subtotal + taxaCartao);
    if (totalCobrado < 1) return res.status(400).json({ success: false, error: 'Valor mínimo para pagamento: R$ 1,00' });

    const saleId = oid();
    await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      id: saleId, base44_id: saleId, buyer_id: buyer.id || null, buyer_email: buyer.email, buyer_name: buyer.name || null,
      seller_id, product_id: main.id, product_title: main.description, product_image: (main.image_urls && main.image_urls[0]) || null,
      sale_price: totalProdutos, total_amount: totalProdutos, quantity: lines.reduce((s, l) => s + l.q, 0), status: 'pending_payment',
      kind: 'loja', payment_method: 'credit_card_mp', tracking_code: 'LZ' + saleId.slice(0, 8).toUpperCase(), created_date: new Date().toISOString(),
      discount_amount: passaporte_desconto || null,
      raw_base44: { passaporte_desconto, delivery_type: body?.delivery_type || null, address: addrS, frete, amount_charged: totalCobrado, taxa_cartao: taxaCartao },
    }) });

    // Checkout Pro (página hospedada do Mercado Pago) — mesma UX de redirecionamento que a Stripe tinha.
    const [first, ...rest] = String(buyer.name || 'Cliente').trim().split(/\s+/);
    const mpItems = lines.map((l) => ({ title: String(l.p.description).slice(0, 120), quantity: l.q, unit_price: unitPrice(l.p), currency_id: 'BRL' }));
    if (frete.valor > 0) mpItems.push({ title: `Frete — ${[frete.empresa, frete.servico].filter(Boolean).join(' ')}`.slice(0, 120), quantity: 1, unit_price: frete.valor, currency_id: 'BRL' });
    if (passaporte_desconto > 0) mpItems.push({ title: 'Desconto Passaporte do Leilão', quantity: 1, unit_price: -passaporte_desconto, currency_id: 'BRL' });
    if (taxaCartao > 0) mpItems.push({ title: 'Taxa de pagamento no cartão', quantity: 1, unit_price: taxaCartao, currency_id: 'BRL' });

    // 🔴 PONTO 124 (21/08/2026) — CARTÃO SEM CPF NO PAYER, PIX SEMPRE MANDOU.
    // O CPF é coletado e validado na tela (Cart.jsx) e chega até aqui em `buyer.cpf`,
    // mas nunca era repassado ao Mercado Pago nesta preferência — createMPPix.js
    // (mesma estrutura, "mesmo motor do PIX" segundo o cabeçalho deste arquivo) sempre
    // mandou `payer.identification`, só o cartão ficou sem. Pagamento de cartão sem
    // identificação do comprador é justamente o que a antifraude do Mercado Pago mais
    // pesa pra recusar no Brasil — explica a recusa em cartões de pessoas diferentes,
    // não é problema do cartão de ninguém.
    const prefBody = {
      items: mpItems,
      payer: {
        email: buyer.email,
        name: first || 'Cliente',
        surname: rest.join(' ') || 'NoZap',
        ...(buyer.cpf ? { identification: { type: 'CPF', number: String(buyer.cpf).replace(/\D/g, '') } } : {}),
      },
      external_reference: saleId,
      notification_url: `${BASE_URL}/api/functions/mpWebhook`,
      back_urls: {
        success: `${BASE_URL}/MyCatalogOrders?paid=1`,
        failure: `${BASE_URL}/Cart`,
        pending: `${BASE_URL}/Cart`,
      },
      auto_return: 'approved',
      // 💳 Só cartão de crédito nesta tela — PIX já tem seu próprio fluxo (createMPPix).
      payment_methods: {
        excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'bank_transfer' }, { id: 'debit_card' }, { id: 'digital_wallet' }],
        installments: 12,
      },
    };
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST', headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(prefBody),
    });
    const pref = await r.json();
    if (!r.ok || !pref?.id) return res.status(200).json({ success: false, error: 'Falha ao criar checkout', details: (pref?.message || JSON.stringify(pref)).slice(0, 300) });

    await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ mp_preference_id: pref.id }) });
    return res.status(200).json({ success: true, sale_id: saleId, amount: totalCobrado, amount_products: totalProdutos, shipping: frete.valor, taxa_cartao: taxaCartao, url: pref.init_point, preference_id: pref.id, passaporte_desconto });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao criar checkout', details: String(e?.message || e) });
  }
}