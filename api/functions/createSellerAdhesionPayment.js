// createSellerAdhesionPayment — pagamento único (PIX, Mercado Pago) da adesão de Vendedor
// (primeira compra de R$1.497). Cria a venda em catalog_sales (kind='seller_adhesion');
// o crédito do saldo (seller_credit_balance) é feito pelo mpWebhook quando o pagamento é
// aprovado — mesmo padrão de api/functions/createAdesaoPayment.js.
import { oid } from '../_lib/oid.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilonozap.vercel.app';
const VALOR_MINIMO = 1497;

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
    const { user_id, amount, buyer_name, buyer_email, buyer_cpf, address, gateway } = body || {};
    const useCard = gateway === 'card';
    if (!user_id) return res.status(200).json({ success: false, error: 'user_id é obrigatório' });
    if (!amount || amount < VALOR_MINIMO) return res.status(200).json({ success: false, error: `A primeira compra do vendedor é de no mínimo R$ ${VALOR_MINIMO}` });
    if (!SUPABASE_URL || !SR || !MP_TOKEN) return res.status(200).json({ success: false, error: 'Mercado Pago não configurado' });

    // 🔒 Endereço vem junto: a escrita direta do navegador no AppUser é bloqueada por RLS
    // (usuário custom, sem sessão autenticada no Supabase) — persiste aqui com service role.
    if (address) {
      await sb(`app_users?id=eq.${encodeURIComponent(user_id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          address_zip_code: address.zip, address_number: address.number, address_street: address.street,
          address_complement: address.complement, address_neighborhood: address.neighborhood,
          address_city: address.city, address_state: address.state,
        }),
      }).catch(() => {});
    }

    const saleId = oid();
    await sb('catalog_sales', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: saleId, base44_id: saleId, kind: 'seller_adhesion',
        buyer_id: user_id, buyer_email, buyer_name,
        product_title: 'Adesão Vendedor - Primeira Compra', sale_price: amount, total_amount: amount, quantity: 1,
        status: 'pending_payment', payment_method: useCard ? 'credit_card_mp' : 'pix_mp',
        tracking_code: 'AD' + saleId.slice(0, 8).toUpperCase(), created_date: new Date().toISOString(),
      }),
    });

    const [first, ...rest] = String(buyer_name || 'Cliente').trim().split(/\s+/);

    // 💳 Cartão parcelado: Mercado Pago Checkout Pro (mesmo padrão de createAdesaoPayment.js) —
    // a própria página hospedada da MP mostra as parcelas e calcula os juros por bandeira/emissor.
    if (useCard) {
      const prefBody = {
        items: [{ title: 'Adesão Vendedor - Primeira Compra', quantity: 1, unit_price: amount, currency_id: 'BRL' }],
        payer: { email: buyer_email || 'sem-email@leilaonozap.net', name: first || 'Cliente', surname: rest.join(' ') || 'NoZap' },
        external_reference: saleId,
        notification_url: `${BASE_URL}/api/functions/mpWebhook`,
        back_urls: { success: `${BASE_URL}/VendedorCheckout`, failure: `${BASE_URL}/VendedorCheckout`, pending: `${BASE_URL}/VendedorCheckout` },
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
      return res.status(200).json({ success: true, gateway: 'card', sale_id: saleId, amount, url: pref.init_point });
    }

    const cleanCpf = String(buyer_cpf || '').replace(/\D/g, '');
    const mp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': saleId },
      body: JSON.stringify({
        transaction_amount: amount,
        description: 'Adesão Vendedor - Primeira Compra - Leilão NoZap',
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
      pix_qr_code: td.qr_code_base64 ? `data:image/png;base64,${td.qr_code_base64}` : null,
      pix_payload: td.qr_code || null,
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao processar pagamento', details: String(e?.message || e) });
  }
}