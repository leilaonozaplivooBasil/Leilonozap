// createSellerFreightPayment — cobra, em UM pagamento (PIX ou cartão), o frete de entrega
// (quando "Receber em casa") + o complemento do valor (quando o total escolhido passa do
// saldo da adesão de R$1.497). Os dois nunca são cobertos pela adesão — vão juntos aqui.
// Frete SEMPRE recotado no servidor (api/_lib/frete.js); complemento SEMPRE recalculado
// no servidor a partir do preço real do produto e do saldo real do usuário — nunca confia
// no valor do cliente. Confirmação é a mesma esteira do resto do site: mpWebhook (kind='seller_freight').
import { oid } from '../_lib/oid.js';
import { resolverFreteDoCheckout } from '../_lib/frete.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilonozap.vercel.app';
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
    const { user_id, items, cep, frete_id, delivery_method, buyer_name, buyer_email, buyer_cpf, gateway } = body || {};
    const useCard = gateway === 'card';
    if (!user_id) return res.status(200).json({ success: false, error: 'user_id é obrigatório' });
    if (!SUPABASE_URL || !SR || !MP_TOKEN) return res.status(200).json({ success: false, error: 'Mercado Pago não configurado' });

    // 🔒 Frete recotado no servidor — zero explícito se for retirada.
    const fr = await resolverFreteDoCheckout({ delivery_type: delivery_method === 'delivery' ? 'delivery' : 'pickup', cep, items, frete_id });
    if (!fr.ok) return res.status(200).json({ success: false, error: fr.error });
    const freteValor = round2(fr.frete.valor);

    // 🔒 Complemento: quanto o total escolhido passa do saldo da adesão — recalculado aqui
    // com o preço REAL do produto e o saldo REAL do usuário, nunca confiando no navegador.
    const userRows = await (await sb(`app_users?select=seller_credit_balance&id=eq.${encodeURIComponent(user_id)}&limit=1`)).json();
    const balance = round2(Number((Array.isArray(userRows) ? userRows[0] : null)?.seller_credit_balance) || 0);
    const ids = (Array.isArray(items) ? items : []).map((it) => String(it.product_id || it.id)).filter(Boolean);
    let total = 0;
    if (ids.length) {
      const prods = await (await sb(`products?select=id,price_catalog&id=in.(${ids.map((x) => `"${x}"`).join(',')})`)).json();
      const byId = Object.fromEntries((Array.isArray(prods) ? prods : []).map((p) => [p.id, p]));
      for (const it of items) {
        const p = byId[String(it.product_id || it.id)];
        const qty = Math.max(1, Number(it.qty || it.quantidade) || 1);
        if (p) total += qty * Number(p.price_catalog || 0);
      }
    }
    total = round2(total);
    const complemento = Math.max(0, round2(total - balance));

    const amount = round2(freteValor + complemento);
    if (amount < 1) return res.status(200).json({ success: false, error: 'Nada a pagar — seu saldo cobre o pedido.' });

    const partes = [];
    if (freteValor > 0) partes.push(`Frete ${fr.frete.empresa || ''} ${fr.frete.servico || ''}`.trim());
    if (complemento > 0) partes.push(`Complemento R$ ${complemento.toFixed(2)}`);
    const titulo = partes.join(' + ') || 'Frete + Complemento';

    const saleId = oid();
    await sb('catalog_sales', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: saleId, base44_id: saleId, kind: 'seller_freight',
        buyer_id: user_id, buyer_email, buyer_name,
        product_title: titulo,
        sale_price: amount, total_amount: amount, quantity: 1,
        status: 'pending_payment', payment_method: useCard ? 'credit_card_mp' : 'pix_mp',
        tracking_code: 'FR' + saleId.slice(0, 8).toUpperCase(), created_date: new Date().toISOString(),
      }),
    });

    const [first, ...rest] = String(buyer_name || 'Cliente').trim().split(/\s+/);
    // 🔴 PONTO 124 (21/08/2026): subiu pra antes do ramo de cartão — antes só existia depois
    // dele (linha do PIX), e o cartão mandava payer sem CPF pro Mercado Pago.
    const cleanCpf = String(buyer_cpf || '').replace(/\D/g, '');

    // 💳 Cartão parcelado: Mercado Pago Checkout Pro (mesmo padrão de createSellerAdhesionPayment.js).
    if (useCard) {
      const prefBody = {
        items: [{ title: titulo, quantity: 1, unit_price: amount, currency_id: 'BRL' }],
        payer: { email: buyer_email || 'sem-email@leilaonozap.net', name: first || 'Cliente', surname: rest.join(' ') || 'NoZap', ...(cleanCpf ? { identification: { type: 'CPF', number: cleanCpf } } : {}) },
        external_reference: saleId,
        notification_url: `${BASE_URL}/api/functions/mpWebhook`,
        back_urls: { success: `${BASE_URL}/VendedorEscolherProdutos`, failure: `${BASE_URL}/VendedorEscolherProdutos`, pending: `${BASE_URL}/VendedorEscolherProdutos` },
        auto_return: 'approved',
        payment_methods: {
          excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'bank_transfer' }, { id: 'debit_card' }, { id: 'digital_wallet' }],
          installments: 12,
        },
      };
      const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(prefBody),
      });
      const pref = await r.json();
      if (!r.ok || !pref?.id) {
        return res.status(200).json({ success: false, error: 'Falha ao criar checkout de cartão', details: (pref?.message || JSON.stringify(pref)).slice(0, 200) });
      }
      await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ mp_preference_id: pref.id }) });
      return res.status(200).json({ success: true, gateway: 'card', sale_id: saleId, amount, freteValor, complemento, url: pref.init_point });
    }

    const mp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': saleId },
      body: JSON.stringify({
        transaction_amount: amount,
        description: `${titulo} - Primeira Compra Vendedor - Leilão NoZap`,
        payment_method_id: 'pix',
        notification_url: `${BASE_URL}/api/functions/mpWebhook`,
        external_reference: saleId,
        payer: {
          email: buyer_email || 'sem-email@leilaonozap.net',
          first_name: first || 'Cliente',
          last_name: rest.join(' ') || 'NoZap',
          ...(cleanCpf ? { identification: { type: 'CPF', number: cleanCpf } } : {}),
        },
      }),
    });
    const pay = await mp.json();
    if (!mp.ok || !pay?.id) {
      return res.status(200).json({ success: false, error: pay?.message || 'Erro ao gerar PIX no Mercado Pago', details: pay });
    }
    const td = pay.point_of_interaction?.transaction_data || {};
    await sb(`catalog_sales?id=eq.${saleId}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ mp_payment_id: String(pay.id), pix_qr: td.qr_code, pix_qr_base64: td.qr_code_base64 }),
    });

    return res.status(200).json({
      success: true,
      payment_id: pay.id,
      amount,
      freteValor,
      complemento,
      pix_qr_code: td.qr_code_base64 ? `data:image/png;base64,${td.qr_code_base64}` : null,
      pix_payload: td.qr_code || null,
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao processar pagamento', details: String(e?.message || e) });
  }
}