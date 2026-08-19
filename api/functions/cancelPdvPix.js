// cancelPdvPix — o cliente desistiu / não pagou no balcão: cancela o pedido PIX ou
// cartão do PDV (apesar do nome, serve os dois — mesma trava de origem 'pdv').
// Segurança: SÓ cancela venda de origem 'pdv' que ainda está 'pending_payment' —
// nunca toca em venda paga (o PATCH condicional no banco garante isso atomicamente).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const saleId = String(body?.sale_id || '').trim();
    if (!saleId) return res.status(400).json({ success: false, error: 'sale_id obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const r = await fetch(`${SUPABASE_URL}/rest/v1/catalog_sales?id=eq.${encodeURIComponent(saleId)}&status=eq.pending_payment&source=eq.pdv`, {
      method: 'PATCH',
      headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'canceled' }),
    });
    const rows = await r.json().catch(() => []);
    const canceled = Array.isArray(rows) && rows.length > 0;

    // 💳 CARTÃO (Checkout Pro): cancelar aqui só apaga a venda no NOSSO banco — o link
    // de pagamento do Mercado Pago continua ativo e aceitando pagamento até vencer
    // sozinho. Invalida a preferência agora (expiração já vencida) pra fechar essa
    // brecha: se o cliente já estava com o link aberto, o MP passa a recusar.
    // Best-effort: falhar aqui NUNCA pode desfazer o cancelamento local já feito.
    if (canceled && MP_TOKEN) {
      try {
        const prefId = rows[0]?.mp_preference_id;
        if (prefId) {
          const vencido = new Date(Date.now() - 3600000).toISOString();
          await fetch(`https://api.mercadopago.com/checkout/preferences/${prefId}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ expires: true, expiration_date_from: vencido, expiration_date_to: vencido }),
          });
        }
      } catch (_) { /* preferência pode continuar ativa até vencer sozinha — não bloqueia o cancelamento */ }
    }

    return res.status(200).json({ success: true, canceled });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}