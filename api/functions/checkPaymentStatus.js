// checkPaymentStatus — usado pelo polling do checkout. Lê o status da venda (que o webhook marca como paga).
// Robustez: se a venda ainda está pendente, consulta o MP; se já aprovou, dispara o webhook (confirma + comissão).
// Aceita DOIS jeitos de perguntar:
//   payment_id → fluxo PIX (o payment_id já nasce junto com o QR, antes do cliente pagar)
//   sale_id    → fluxo cartão/Checkout Pro (só existe payment_id DEPOIS que o cliente paga;
//                antes disso só se conhece o pedido, então a consulta ao MP é por
//                external_reference em vez de payment_id)
//
// 🛡️ DIR-211 (08/10/2026) — depósito aprovado que o antifraude segurou responde status
// 'em_analise' (com espera_ate e se libera sozinho): a tela mostra "em conferência" em vez
// de prometer "confirmado". Vencida a espera, o próprio poll re-dispara o webhook por
// dentro (x-interno) e responde o que REALMENTE ficou gravado — antes, a rota dizia
// "confirmed" logo depois de disparar o webhook, sem olhar se ele creditou.
import { statusNoExtrato, decisaoDoPortao, liberaSozinho, dispararWebhookInterno } from '../_lib/antifraudeDeposito.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

// 'recusado' nunca é "entra sozinho": o dinheiro está sendo devolvido pelo gateway.
const emAnalise = (sale, extra = {}) => {
  const decisao = sale?.antifraude_decisao || extra.decisao || null;
  return { found: true, status: 'em_analise', espera_ate: sale?.antifraude_espera_ate || extra.espera_ate || null, automatico: decisao === 'recusado' ? false : (extra.automatico ?? liberaSozinho(sale?.antifraude_motivo)), decisao };
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const paymentId = String(body?.payment_id || '').trim();
    const saleId = String(body?.sale_id || '').trim();
    if (!paymentId && !saleId) return res.status(200).json({ found: false });
    if (!SUPABASE_URL || !SR) return res.status(200).json({ found: false });

    // 💳 fluxo cartão (Checkout Pro): pergunta pelo pedido, não pelo pagamento —
    // ainda não existe payment_id enquanto o cliente não paga o link/QR.
    if (!paymentId && saleId) {
      const rowsSale = await (await sb(`catalog_sales?select=id,status&id=eq.${encodeURIComponent(saleId)}&source=eq.pdv&limit=1`)).json();
      const saleByOrder = Array.isArray(rowsSale) ? rowsSale[0] : null;
      if (!saleByOrder) return res.status(200).json({ found: false });
      if (saleByOrder.status === 'paid') return res.status(200).json({ found: true, status: 'confirmed' });
      if (MP_TOKEN) {
        const rBusca = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(saleId)}&sort=date_created&criteria=desc`, { headers: { Authorization: `Bearer ${MP_TOKEN}` } });
        const busca = await rBusca.json();
        const aprovado = (busca?.results || []).find((p) => p.status === 'approved');
        if (aprovado) {
          // dispara o webhook (fonte única de confirmação + comissão, idempotente) e só
          // confirma pro balcão depois de CONFERIR o status realmente gravado — se essa
          // chamada falhar (rede, 5xx), a tela não pode achar que estoque/comissão já saíram.
          const webhook = await dispararWebhookInterno(aprovado.id, 'poll');
          const webhookOk = webhook.http >= 200 && webhook.http < 300;
          if (!webhookOk) return res.status(200).json({ found: true, status: 'pending' });
          const settledRows = await (await sb(`catalog_sales?select=status&id=eq.${encodeURIComponent(saleId)}&limit=1`)).json();
          const settled = Array.isArray(settledRows) ? settledRows[0] : null;
          return res.status(200).json({ found: true, status: ['paid', 'entregue'].includes(settled?.status) ? 'confirmed' : 'pending' });
        }
      }
      return res.status(200).json({ found: true, status: 'pending' });
    }

    const rows = await (await sb(`catalog_sales?select=id,status,kind,antifraude_motivo,antifraude_espera_ate,antifraude_decisao&mp_payment_id=eq.${encodeURIComponent(paymentId)}&limit=1`)).json();
    const sale = Array.isArray(rows) ? rows[0] : null;
    if (sale && sale.status === 'paid') return res.status(200).json({ found: true, status: 'confirmed' });

    // 🛡️ DIR-211 — pago, mas em conferência: a espera venceu e o motivo libera sozinho? re-dispara.
    if (sale && statusNoExtrato(sale) === 'em_analise') {
      // a espera venceu e libera sozinho, ou já foi decidido liberar e o crédito ainda não aconteceu: re-dispara
      if (['auto_liberar', 'passar'].includes(decisaoDoPortao(sale))) {
        const j = await dispararWebhookInterno(paymentId, 'poll');
        if (j?.paid || j?.already_paid) return res.status(200).json({ found: true, status: 'confirmed' });
      }
      return res.status(200).json(emAnalise(sale));
    }

    // venda ainda pendente: consulta o MP direto (caso o webhook não tenha chegado)
    if (MP_TOKEN) {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${MP_TOKEN}` } });
      const pay = await r.json();
      if (r.ok && pay?.status === 'approved') {
        // dispara o webhook (fonte única de confirmação + comissão, idempotente) e responde
        // o que ele fez — "em_espera" é conferência do antifraude, não confirmação.
        const j = await dispararWebhookInterno(paymentId, 'poll');
        if (j?.em_espera) return res.status(200).json(emAnalise(null, { espera_ate: j.espera_ate, automatico: !!j.automatico, decisao: j.decisao }));
        if (j?.paid || j?.already_paid) return res.status(200).json({ found: true, status: 'confirmed' });
        // o webhook não confirmou (efeito falhou, 5xx): devolve o que ficou gravado em vez de prometer
        const conf = await (await sb(`catalog_sales?select=status&mp_payment_id=eq.${encodeURIComponent(paymentId)}&limit=1`)).json().catch(() => []);
        return res.status(200).json({ found: true, status: Array.isArray(conf) && conf[0]?.status === 'paid' ? 'confirmed' : 'pending' });
      }
      return res.status(200).json({ found: true, status: pay?.status || 'pending' });
    }
    return res.status(200).json({ found: !!sale, status: 'pending' });
  } catch (e) {
    return res.status(200).json({ found: false, error: String(e?.message || e) });
  }
}
