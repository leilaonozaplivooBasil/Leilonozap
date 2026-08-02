// createPartnerPlanPix — gera o PIX de adesão ao Plano de Parceiro (InvestorDashboard).
// Antes: função Deno (ASAAS) sem equivalente Vercel — 404 em produção, botão "Gerar PIX" sempre falhava.
// Agora: Mercado Pago, mesmo padrão de createMPWalletDeposit (catalog_sales pendente + mpWebhook confirma).
import { oid } from '../_lib/oid.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilonozap.vercel.app';

// Mesmos planos oferecidos em InvestorDashboard.jsx (o front só manda o nome do plano).
const PLAN_AMOUNTS = {
  'Plano Visionário': 5000,
  'Plano Sócios de Ouro': 15000,
  'Plano Elite': 30000,
};

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

    const licenseeId = body?.licensee_id;
    const userName = String(body?.user_name || '').trim();
    const userEmail = String(body?.user_email || '').trim();
    const userCpf = String(body?.user_cpf || '').replace(/\D/g, '');
    const planCode = String(body?.plan_code || '').trim();
    const amount = PLAN_AMOUNTS[planCode];

    if (!licenseeId) return res.status(200).json({ success: false, error: 'Parceiro não identificado' });
    if (!amount) return res.status(200).json({ success: false, error: 'Plano inválido' });
    if (!userEmail) return res.status(200).json({ success: false, error: 'E-mail obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });
    if (!MP_TOKEN) return res.status(200).json({ success: false, error: 'PIX indisponível no momento' });

    // registra a venda pendente — kind='partner_plan' é lido pelo mpWebhook pra ativar o plano
    const saleId = oid();
    await sb('catalog_sales', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: saleId, base44_id: saleId, kind: 'partner_plan',
        buyer_id: licenseeId, buyer_email: userEmail, buyer_name: userName,
        product_title: planCode, sale_price: amount, total_amount: amount, quantity: 1,
        status: 'pending_payment', payment_method: 'pix_mp',
        tracking_code: 'PP' + saleId.slice(0, 8).toUpperCase(),
        created_date: new Date().toISOString(),
      }),
    });

    const [first, ...rest] = userName.split(/\s+/);
    const mp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': saleId },
      body: JSON.stringify({
        transaction_amount: amount,
        description: `Parceria de Compra - ${planCode}`,
        payment_method_id: 'pix',
        notification_url: `${BASE_URL}/api/functions/mpWebhook`,
        external_reference: saleId,
        payer: {
          email: userEmail,
          first_name: first || 'Parceiro',
          last_name: rest.join(' ') || 'NoZap',
          ...(userCpf ? { identification: { type: 'CPF', number: userCpf } } : {}),
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

    const result = {
      success: true,
      billing_id: String(pay.id),
      payment_id: String(pay.id),
      sale_id: saleId,
      amount,
      qr_code_base64: td.qr_code_base64 ? `data:image/png;base64,${td.qr_code_base64}` : null,
      pix_code: td.qr_code,
    };
    // 🩹 duplica em `data` — mantém compat com código do front escrito pro padrão antigo do SDK
    return res.status(200).json({ ...result, data: result });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao processar pagamento', details: String(e?.message || e) });
  }
}