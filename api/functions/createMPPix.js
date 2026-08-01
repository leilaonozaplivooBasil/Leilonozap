// createMPPix — cria uma cobrança PIX no Mercado Pago para uma compra de catálogo.
// Valor calculado NO SERVIDOR (nunca confia no client). Cria a venda (pending_payment),
// gera o PIX e devolve QR + copia-e-cola. O webhook confirma e paga comissões.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
import { calcularDesconto } from '../_lib/passaporteCoupon.js';
import { resolverFreteDoCheckout } from '../_lib/frete.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilonozap.vercel.app';
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
    const items = Array.isArray(body?.items) && body.items.length ? body.items
      : (body?.product_id ? [{ product_id: body.product_id, quantity: body.quantity || 1 }] : []);
    if (!buyer?.email || !items.length) return res.status(400).json({ success: false, error: 'Comprador e itens são obrigatórios' });
    if (!SUPABASE_URL || !SR || !MP_TOKEN) return res.status(500).json({ success: false, error: 'Config do servidor ausente (MP/Supabase)' });

    // Preço SEMPRE do banco (anti-fraude). Pega o primeiro item como produto principal da venda.
    const ids = items.map((i) => i.product_id).filter(Boolean);
    const prods = await (await sb(`products?select=id,description,price_catalog,selling_price_retail,image_urls&id=in.(${ids.map((x) => `"${x}"`).join(',')})`)).json();
    const pmap = Object.fromEntries((Array.isArray(prods) ? prods : []).map((p) => [p.id, p]));
    // preço = mesmo fallback da vitrine (price_catalog → varejo). Sem isso, os 376 itens sem
    // price_catalog que a vitrine mostra dariam total 0 e o PIX não gerava.
    const unitPrice = (p) => (Number(p.price_catalog) > 0 ? Number(p.price_catalog) : Number(p.selling_price_retail) || 0);
    let total = 0; const lines = [];
    for (const it of items) {
      const p = pmap[it.product_id]; if (!p) continue;
      const q = Math.max(1, parseInt(it.quantity) || 1);
      total += unitPrice(p) * q;
      lines.push({ p, q });
    }
    total = round2(total);
    if (total <= 0) return res.status(400).json({ success: false, error: 'Itens inválidos' });
    const main = lines[0].p;

    // resolve seller p/ atribuição de comissão: prioridade ref_code do link, senão indicador do comprador
    let seller_id = null;
    const refCode = String(body?.ref_code || '').trim();
    if (refCode) {
      const r = await (await sb(`app_users?select=id&referral_code=eq.${encodeURIComponent(refCode)}&limit=1`)).json();
      if (Array.isArray(r) && r[0]) seller_id = r[0].id;
    }
    if (!seller_id && buyer.id) {
      const b = await (await sb(`app_users?select=referred_by_id&id=eq.${encodeURIComponent(buyer.id)}&limit=1`)).json();
      if (Array.isArray(b) && b[0]) seller_id = b[0].referred_by_id || null;
    }
    // 🛡️ o vendedor PRECISA existir. Havia venda gravada com seller_id apontando pra um usuário
    // inexistente (id legado do Base44): a cadeia de comissão nascia vazia e NINGUÉM recebia,
    // em silêncio. Se não existir, a venda fica sem vendedor (não paga fantasma).
    if (seller_id) {
      const ex = await (await sb(`app_users?select=id&id=eq.${encodeURIComponent(seller_id)}&limit=1`)).json();
      if (!Array.isArray(ex) || !ex.length) seller_id = null;
    }

    // cupom (desconto validado e calculado no servidor — não confia no cliente)
    const subtotal = total;
    let coupon_code = null, discount_amount = 0, coupon_id = null;
    const couponInput = String(body?.coupon_code || '').trim();
    if (couponInput) {
      try {
        const cr = await (await sb('rpc/aplicar_cupom', { method: 'POST', body: JSON.stringify({ _code: couponInput, _subtotal: subtotal, _seller: seller_id }) })).json();
        if (cr?.valido) { discount_amount = Number(cr.desconto) || 0; total = round2(Number(cr.total_final) || subtotal); coupon_code = cr.code; coupon_id = cr.coupon_id; }
      } catch (_) { /* cupom inválido → ignora, cobra cheio */ }
    }
    // 🎟️ Cupom Passaporte (crédito de 10% do aporte). Validado e calculado SEMPRE no
    // servidor: dono do cupom, status liberado e saldo. O PIX exige R$ 1,00 mínimo, então
    // o abatimento para em R$ 1,00 e o resto do crédito continua guardado no cupom.
    let passaporte_coupon_id = null, passaporte_desconto = 0;
    if (body?.use_passaporte === true && buyer?.id) {
      const abativel = round2(Math.max(0, total - 1));
      const pc = abativel > 0 ? await calcularDesconto(buyer.id, abativel) : null;
      if (pc) {
        passaporte_coupon_id = pc.coupon_id;
        passaporte_desconto = pc.desconto;
        total = round2(total - passaporte_desconto);
      }
    }
    if (total < 1) return res.status(400).json({ success: false, error: 'Valor mínimo para pagamento: R$ 1,00' });

    // 🚚 PONTO 74 — frete RECOTADO no servidor (o cliente só manda o ID da transportadora).
    // total_amount continua sendo SÓ produtos (base da comissão); o frete vai separado.
    const addr = body?.address || {};
    const fr = await resolverFreteDoCheckout({
      delivery_type: body?.delivery_type,
      cep: addr?.zip || body?.cep,
      items,
      frete_id: body?.frete_id,
    });
    if (!fr.ok) return res.status(200).json({ success: false, error: fr.error });
    const frete = fr.frete;
    const totalCobrado = round2(total + frete.valor);

    // cria a venda pendente (com entrega/endereço)
    const saleId = oid();
    await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      id: saleId, base44_id: saleId, buyer_id: buyer.id || null, buyer_email: buyer.email, buyer_name: buyer.name || null,
      seller_id, product_id: main.id, product_title: main.description, product_image: (main.image_urls && main.image_urls[0]) || null,
      sale_price: total, total_amount: total, quantity: lines.reduce((s, l) => s + l.q, 0), status: 'pending_payment',
      kind: 'loja', // venda de catálogo → comissão pro DONO da loja (modelo marketplace) via fulfillStoreOrder
      payment_method: 'pix_mp', tracking_code: 'LZ' + saleId.slice(0, 8).toUpperCase(), created_date: new Date().toISOString(),
      coupon_code, discount_amount: round2(discount_amount + passaporte_desconto) || null,
      raw_base44: { items: lines.map((l) => ({ id: l.p.id, title: l.p.description, qty: l.q, price: unitPrice(l.p) })), delivery_type: body?.delivery_type || null, address: addr, ref_code: refCode || null, coupon_id, passaporte_coupon_id, passaporte_desconto, frete, amount_charged: totalCobrado },
    }) });
    if (coupon_id) { try { await sb(`rpc/increment_coupon`, { method: 'POST', body: JSON.stringify({ _id: coupon_id }) }); } catch (_) {} }

    // cria o PIX no Mercado Pago
    const [first, ...rest] = String(buyer.name || 'Cliente').trim().split(/\s+/);
    const payBody = {
      transaction_amount: totalCobrado, // produtos − descontos + frete recotado no servidor
      description: `Loja Virtual - ${main.description}`.slice(0, 200),
      payment_method_id: 'pix',
      notification_url: `${BASE_URL}/api/functions/mpWebhook`,
      external_reference: saleId,
      payer: {
        email: buyer.email,
        first_name: first || 'Cliente',
        last_name: rest.join(' ') || 'NoZap',
        ...(buyer.cpf ? { identification: { type: 'CPF', number: String(buyer.cpf).replace(/\D/g, '') } } : {}),
      },
    };
    const mp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': saleId },
      body: JSON.stringify(payBody),
    });
    const pay = await mp.json();
    if (!mp.ok || !pay?.id) {
      return res.status(200).json({ success: false, error: 'Falha ao gerar PIX', details: (pay?.message || JSON.stringify(pay)).slice(0, 300) });
    }
    const td = pay.point_of_interaction?.transaction_data || {};
    await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      mp_payment_id: String(pay.id), pix_qr: td.qr_code || null, pix_qr_base64: td.qr_code_base64 || null, pix_ticket_url: td.ticket_url || null,
    }) });

    return res.status(200).json({
      success: true,
      sale_id: saleId,
      amount: totalCobrado,
      amount_products: total,
      shipping: frete.valor,
      shipping_carrier: [frete.empresa, frete.servico].filter(Boolean).join(' ') || null,
      payment_id: String(pay.id),
      status: pay.status,
      passaporte_desconto,
      pix_code: td.qr_code || null,            // copia-e-cola
      qr_code_base64: td.qr_code_base64 || null, // imagem QR (base64)
      ticket_url: td.ticket_url || null,        // link hospedado MP
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao criar PIX', details: String(e?.message || e) });
  }
}