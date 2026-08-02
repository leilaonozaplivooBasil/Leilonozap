// createMPWalletDeposit — gera a cobrança do checkout "Finalizar Compra" (inserir saldo na carteira e arremate).
// Renomeada de "createAsaasPayment" (nome legado enganoso): o gateway sempre foi Mercado Pago (PIX),
// igual ao resto do sistema (checkPaymentStatus + mpWebhook são chaveados por mp_payment_id).
// Cartão inline ainda não está ligado.
import { oid } from '../_lib/oid.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilonozap.vercel.app';

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

    const amount = money(body?.amount);
    const billingType = String(body?.billing_type || 'PIX').toUpperCase();
    const auctionId = body?.auction_id || null;
    const buyerId = body?.buyer_id || null;
    const buyerName = String(body?.buyer_name || 'Cliente').trim();
    const buyerEmail = String(body?.buyer_email || '').trim();
    const buyerCpf = String(body?.buyer_cpf || '').replace(/\D/g, '');
    const depositType = body?.deposit_type || (auctionId ? null : 'digital_wallet');
    const isWalletDeposit = !auctionId || !!body?.is_investor_capital || !!depositType;
    const description = String(body?.description || 'Pagamento - Leilão NoZap').slice(0, 200);

    if (amount <= 0) return res.status(200).json({ success: false, error: 'Valor inválido' });
    if (!buyerEmail) return res.status(200).json({ success: false, error: 'E-mail obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // 💳 Cartão de crédito via Mercado Pago (token gerado pelo SDK JS no navegador).
    // Branch ADITIVO — não reaproveita nem altera nenhuma linha do fluxo PIX abaixo.
    if (billingType === 'CREDIT_CARD') {
      if (!MP_TOKEN) return res.status(200).json({ success: false, error: 'Pagamento indisponível no momento' });
      const cardToken = body?.card_token;
      const cardPaymentMethodId = body?.payment_method_id;
      const installments = Math.min(12, Math.max(1, parseInt(body?.installments) || 1));
      if (!cardToken || !cardPaymentMethodId) {
        return res.status(200).json({ success: false, error: 'Dados do cartão inválidos. Tente novamente.' });
      }

      const cardSaleId = oid();
      const cardKind = !isWalletDeposit
        ? 'arremate'
        : (depositType === 'passaporte' ? 'passaporte'
          : depositType === 'commission_wallet' ? 'commission_deposit'
          : 'wallet_deposit');
      await sb('catalog_sales', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          id: cardSaleId, base44_id: cardSaleId, kind: cardKind,
          buyer_id: buyerId, buyer_email: buyerEmail, buyer_name: buyerName,
          product_title: description, sale_price: amount, total_amount: amount, quantity: 1,
          status: 'pending_payment', payment_method: 'credit_card_mp',
          tracking_code: (isWalletDeposit ? 'DP' : 'AR') + cardSaleId.slice(0, 8).toUpperCase(),
          created_date: new Date().toISOString(),
        }),
      });

      const [cardFirst, ...cardRest] = buyerName.split(/\s+/);
      const mpCard = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': cardSaleId },
        body: JSON.stringify({
          transaction_amount: amount,
          token: cardToken,
          description,
          installments,
          payment_method_id: cardPaymentMethodId,
          external_reference: cardSaleId,
          notification_url: `${BASE_URL}/api/functions/mpWebhook`,
          payer: {
            email: buyerEmail,
            first_name: cardFirst || 'Cliente',
            last_name: cardRest.join(' ') || 'NoZap',
            ...(buyerCpf ? { identification: { type: 'CPF', number: buyerCpf } } : {}),
          },
        }),
      });
      const cardPay = await mpCard.json();
      if (!mpCard.ok || !cardPay?.id) {
        return res.status(200).json({ success: false, error: 'Falha ao processar cartão', details: (cardPay?.message || '').slice(0, 200) });
      }
      if (cardPay.status === 'rejected') {
        return res.status(200).json({ success: false, error: 'Pagamento recusado pela operadora do cartão.', details: cardPay.status_detail || null });
      }

      await sb(`catalog_sales?id=eq.${cardSaleId}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ mp_payment_id: String(cardPay.id) }),
      });

      // Cartão é síncrono: se já aprovou, dispara a MESMA confirmação que o webhook real
      // usaria (fulfillStoreOrder, activatePartnerPlan, creditWalletDeposit, etc.) chamando
      // o próprio endpoint do webhook — reaproveita 100% da regra de negócio sem duplicar
      // nem tocar em mpWebhook.js. O webhook real do MP também chega depois como rede de segurança.
      if (cardPay.status === 'approved') {
        try {
          await fetch(`${BASE_URL}/api/functions/mpWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { id: cardPay.id } }),
          });
        } catch (_) { /* rede de segurança: o webhook do MP também vai chegar */ }
      }

      return res.status(200).json({
        success: true,
        billing_type: 'CREDIT_CARD',
        sale_id: cardSaleId,
        amount,
        payment_id: String(cardPay.id),
        status: cardPay.status,
        status_detail: cardPay.status_detail,
        installments,
      });
    }

    if (billingType !== 'PIX') {
      return res.status(200).json({ success: false, error: 'Forma de pagamento não suportada.' });
    }
    if (!MP_TOKEN) return res.status(200).json({ success: false, error: 'PIX indisponível no momento' });

    // registra a venda pendente (fonte única; o webhook confirma e credita).
    // deposit_type nao existe como coluna -> codificamos a carteira-destino no 'kind':
    //   commission_deposit -> credita commission_balance | wallet_deposit -> credita saldo_disponivel
    const saleId = oid();
    const kind = !isWalletDeposit
      ? 'arremate'
      : (depositType === 'passaporte' ? 'passaporte'
        : depositType === 'commission_wallet' ? 'commission_deposit'
        : 'wallet_deposit');
    await sb('catalog_sales', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: saleId, base44_id: saleId, kind,
        buyer_id: buyerId, buyer_email: buyerEmail, buyer_name: buyerName,
        product_title: description, sale_price: amount, total_amount: amount, quantity: 1,
        status: 'pending_payment', payment_method: 'pix_mp',
        tracking_code: (isWalletDeposit ? 'DP' : 'AR') + saleId.slice(0, 8).toUpperCase(),
        created_date: new Date().toISOString(),
      }),
    });

    const [first, ...rest] = buyerName.split(/\s+/);
    const mp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': saleId },
      body: JSON.stringify({
        transaction_amount: amount,
        description,
        payment_method_id: 'pix',
        notification_url: `${BASE_URL}/api/functions/mpWebhook`,
        external_reference: saleId,
        payer: {
          email: buyerEmail,
          first_name: first || 'Cliente',
          last_name: rest.join(' ') || 'NoZap',
          ...(buyerCpf ? { identification: { type: 'CPF', number: buyerCpf } } : {}),
        },
      }),
    });
    const pay = await mp.json();
    if (!mp.ok || !pay?.id) {
      return res.status(200).json({ success: false, error: 'Falha ao gerar PIX', details: (pay?.message || '').slice(0, 200) });
    }
    const td = pay.point_of_interaction?.transaction_data || {};
    await sb(`catalog_sales?id=eq.${saleId}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ mp_payment_id: String(pay.id), pix_qr: td.qr_code, pix_qr_base64: td.qr_code_base64, pix_ticket_url: td.ticket_url }),
    });

    return res.status(200).json({
      success: true,
      billing_type: 'PIX',
      sale_id: saleId,
      amount,
      payment_id: String(pay.id),
      pix_payload: td.qr_code,                                   // copia-e-cola
      pix_qr_code: td.qr_code_base64 ? `data:image/png;base64,${td.qr_code_base64}` : null, // imagem do QR
      ticket_url: td.ticket_url,
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao processar pagamento', details: String(e?.message || e) });
  }
}