// ============================================================================
// regerarPixPedido — gera uma cobrança PIX NOVA para um pedido QUE JÁ EXISTE.
// ============================================================================
// 🔴 RISCO ALTO: cria cobrança real no Mercado Pago.
//
// POR QUE ESTA ROTA EXISTE (e não reaproveita createMPPix):
// `createMPPix` CRIA o pedido junto com a cobrança. Chamá-la de novo geraria um
// SEGUNDO pedido para a mesma compra — venda duplicada no painel e comissão
// contada duas vezes. Esta rota NÃO cria pedido: ela só troca a cobrança do
// pedido existente, mantendo o MESMO identificador.
//
// ⚠️ ARMADILHA DO MERCADO PAGO (motivo do carimbo de tempo na chave):
// `createMPPix` usa `X-Idempotency-Key: saleId`. Se reutilizássemos essa chave,
// o MP devolveria a MESMA cobrança antiga (já vencida) em vez de criar uma nova —
// o cliente clicaria em "Pagar agora" e receberia o PIX morto outra vez.
// Por isso a chave leva o instante da tentativa.
//
// 🔒 O VALOR NUNCA VEM DO NAVEGADOR. É sempre o que está gravado no pedido.
// ============================================================================

import { exigirSessao } from '../_lib/sessao.js';
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

// ══════════════════════════════════════════════════════════════════════════════
// 🔴 PONTO 122 (21/08/2026) — O QR ANTIGO CONTINUAVA VIVO (risco #22)
// ══════════════════════════════════════════════════════════════════════════════
// Esta rota trocava `mp_payment_id` pelo da cobrança nova e ia embora. A cobrança
// ANTIGA continuava aberta no Mercado Pago, e ninguém definia validade nenhuma —
// nem na antiga, nem na nova. O QR velho segue pagável, e ele está no celular do
// cliente, no print que ele mandou pro cônjuge, no e-mail.
//
// O ESTRAGO, na ordem em que acontece de verdade:
//   1. o cliente clica "gerar novo PIX" e paga o QR NOVO → venda vira paid;
//   2. dias depois alguém paga o QR VELHO (o print que ficou no WhatsApp);
//   3. o webhook acha a venda pelo external_reference, vê status 'paid' e
//      responde `already_paid`. O dinheiro entra e ninguém no mundo é avisado.
// Ou seja: cliente cobrado duas vezes, sem estorno e sem alerta.
//
// Duas travas, porque uma só não fecha:
//   • CANCELA a cobrança anterior no MP antes de criar a nova (esta função);
//   • carimba VALIDADE na nova, pra que nenhum QR fique eterno.
//
// Best-effort de propósito: se o MP recusar o cancelamento, o cliente ainda
// precisa conseguir pagar — a gente registra e segue. O único caso que PARA o
// fluxo é a cobrança antiga estar APROVADA (tratado no handler).
const HORAS_VALIDADE_PIX = 24;

/** Validade no formato que o Mercado Pago exige, no relógio de Brasília (-03:00). */
function validadePix(horas) {
  const alvo = new Date(Date.now() + horas * 3600 * 1000 - 3 * 3600 * 1000);
  return alvo.toISOString().replace('Z', '-03:00');
}

async function situacaoCobrancaAntiga(paymentId) {
  if (!paymentId) return { estado: 'sem_cobranca_anterior' };
  try {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    const p = await r.json().catch(() => null);
    if (!r.ok || !p?.id) return { estado: 'nao_encontrada' };
    if (p.status === 'approved') return { estado: 'ja_paga', status: p.status };
    // 'pending' e 'in_process' são as que continuam pagáveis — só essas precisam morrer.
    if (!['pending', 'in_process'].includes(String(p.status))) return { estado: 'ja_inativa', status: p.status };

    const c = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `cancelar-${paymentId}`,
      },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    if (!c.ok) {
      const t = await c.text();
      console.error(`[PIX] NÃO CONSEGUI CANCELAR a cobrança antiga ${paymentId} — ela continua pagável: ${t.slice(0, 200)}`);
      return { estado: 'falhou_cancelar', status: p.status };
    }
    return { estado: 'cancelada' };
  } catch (e) {
    console.error(`[PIX] erro ao cancelar a cobrança antiga ${paymentId}:`, e?.message);
    return { estado: 'falhou_cancelar' };
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const saleId = String(body?.sale_id || '').trim();
    const userId = String(body?.user_id || '').trim();
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, userId, 'regerarPixPedido');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });

    if (!saleId || !userId) return res.status(400).json({ success: false, error: 'Pedido e usuário são obrigatórios' });
    if (!SUPABASE_URL || !SR || !MP_TOKEN) return res.status(500).json({ success: false, error: 'Config do servidor ausente (MP/Supabase)' });

    // 1) Carrega o pedido
    const rows = await (await sb(`catalog_sales?select=*&id=eq.${encodeURIComponent(saleId)}&limit=1`)).json();
    const sale = Array.isArray(rows) ? rows[0] : null;
    if (!sale) return res.status(200).json({ success: false, error: 'Pedido não encontrado' });

    // 2) DONO — ninguém gera cobrança no pedido de outra pessoa
    if (String(sale.buyer_id || '') !== userId) {
      return res.status(200).json({ success: false, error: 'Este pedido não é seu' });
    }

    // 3) STATUS — pedido pago ou cancelado nunca gera nova cobrança.
    //    Pago: cobraria o cliente duas vezes. Cancelado: o item já foi liberado.
    if (sale.status === 'paid') return res.status(200).json({ success: false, error: 'Este pedido já está pago' });
    if (sale.status !== 'pending_payment') {
      return res.status(200).json({ success: false, error: 'Este pedido não está mais aguardando pagamento' });
    }

    // 4) ESTOQUE — não cobrar por algo que não pode ser entregue.
    //    Só bloqueia quando o estoque é um número conhecido e zerado; produto sem
    //    controle de estoque preenchido segue o fluxo (era assim antes).
    if (sale.product_id) {
      const prods = await (await sb(`products?select=*&id=eq.${encodeURIComponent(sale.product_id)}&limit=1`)).json();
      const prod = Array.isArray(prods) ? prods[0] : null;
      const estoque = prod ? Number(prod.stock) : null;
      if (prod && Number.isFinite(estoque) && estoque <= 0) {
        return res.status(200).json({
          success: false,
          out_of_stock: true,
          error: 'Este produto esgotou enquanto o pagamento estava pendente. Não vamos cobrar por algo que não podemos entregar.',
        });
      }
    }

    // 5) VALOR — exatamente o que já foi cobrado da primeira vez (produtos − descontos + frete).
    //    `amount_charged` foi gravado por createMPPix no fechamento do pedido.
    const raw = sale.raw_base44 || {};
    const valor = Number(raw.amount_charged) > 0
      ? Number(raw.amount_charged)
      : Number(sale.total_amount) || 0;
    if (!(valor >= 1)) return res.status(200).json({ success: false, error: 'Valor do pedido inválido para PIX' });

    // 6) MATA A COBRANÇA ANTERIOR ANTES DE CRIAR A NOVA (PONTO 122, risco #22).
    //    Se a antiga já estiver APROVADA, este pedido está pago e o webhook ainda
    //    não chegou: gerar outra cobrança aqui cobraria o cliente duas vezes.
    const antiga = await situacaoCobrancaAntiga(sale.mp_payment_id);
    if (antiga.estado === 'ja_paga') {
      console.error(`[PIX] Pedido ${saleId} pediu novo PIX mas a cobrança ${sale.mp_payment_id} já está APROVADA. Nova cobrança NÃO foi criada.`);
      return res.status(200).json({
        success: false,
        ja_pago: true,
        error: 'Recebemos o seu pagamento. A confirmação entra em instantes — não precisa pagar de novo.',
      });
    }

    // 7) Nova cobrança PIX — MESMO external_reference (o webhook continua achando
    //    este pedido) e chave de idempotência nova (senão o MP devolve a antiga).
    const [first, ...rest] = String(sale.buyer_name || 'Cliente').trim().split(/\s+/);
    const mp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${saleId}-retry-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: valor,
        description: `Loja Virtual - ${sale.product_title || 'Pedido'}`.slice(0, 200),
        payment_method_id: 'pix',
        // ⏰ PONTO 122: sem isto o QR nunca morre. Com validade, o pior caso
        // "cliente paga um código velho" tem prazo pra acabar — e o cliente
        // continua tendo o botão de gerar outro sempre que precisar.
        date_of_expiration: validadePix(HORAS_VALIDADE_PIX),
        notification_url: `${BASE_URL}/api/functions/mpWebhook`,
        external_reference: saleId,
        payer: {
          email: sale.buyer_email,
          first_name: first || 'Cliente',
          last_name: rest.join(' ') || 'NoZap',
        },
      }),
    });
    const pay = await mp.json();
    if (!mp.ok || !pay?.id) {
      return res.status(200).json({
        success: false,
        error: 'Não foi possível gerar o novo código PIX agora',
        details: String(pay?.message || JSON.stringify(pay)).slice(0, 300),
      });
    }

    const td = pay.point_of_interaction?.transaction_data || {};

    // 8) Atualiza o pedido com a cobrança nova. O pedido continua o MESMO.
    await sb(`catalog_sales?id=eq.${encodeURIComponent(saleId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        mp_payment_id: String(pay.id),
        pix_qr: td.qr_code || null,
        pix_qr_base64: td.qr_code_base64 || null,
        pix_ticket_url: td.ticket_url || null,
      }),
    });

    return res.status(200).json({
      success: true,
      sale_id: saleId,
      cobranca_anterior: antiga.estado,
      amount: valor,
      payment_id: String(pay.id),
      pix_code: td.qr_code || null,
      qr_code_base64: td.qr_code_base64 || null,
      ticket_url: td.ticket_url || null,
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao gerar novo PIX', details: String(e?.message || e) });
  }
}