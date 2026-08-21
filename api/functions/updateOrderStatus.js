// updateOrderStatus — atualiza o status de fulfillment de um pedido (service_role).
// Usa o campo `status` (sem DDL). Guard: ator admin/super_admin OU o vendedor do pedido.
//
// ══════════════════════════════════════════════════════════════════════════════
// 🔴 PONTO 99 (21/08/2026) — CANCELAR NÃO ESTORNAVA NADA
// ══════════════════════════════════════════════════════════════════════════════
// A auditoria geral achou dois vazamentos que se somavam na MESMA venda, e o
// gatilho dos dois era este arquivo: cancelar era um PATCH de UMA coluna.
//
//   1) A comissão de 30% já tinha sido gravada e CREDITADA como saldo sacável
//      por storeFulfill.js quando o pagamento confirmou. Ninguém tirava de
//      volta. A plataforma pagava 30% de uma venda que não existe.
//   2) O escrow do vendedor (migração 20260716_saldo_a_liberar.sql) maturava
//      por PRAZO, sem nunca olhar o estado da venda: 7 dias depois (14 no
//      cartão) o vendedor recebia o VALOR TOTAL de uma venda cancelada.
//
// E o pior: o `isSeller` abaixo permitia que o PRÓPRIO VENDEDOR apertasse
// cancelar na tela dele. Ele ficava com o dinheiro do comprador, com a
// comissão e com o escrow, e a venda constava como cancelada.
//
// Agora:
//   • cancelamento de venda JÁ PAGA exige admin/super_admin — o vendedor
//     continua podendo cancelar pedido que ainda não foi pago;
//   • o cancelamento passa pela função cancelar_venda() (migração
//     20260821_cancelamento_estorna.sql), que prende o escrow, estorna a
//     comissão já creditada e devolve quanto NÃO foi recuperado de quem já
//     tinha sacado.
//
// ⚠️ O que continua fora daqui, de propósito: devolver ao COMPRADOR o que ele
// pagou. Estornar PIX no Mercado Pago ou creditar como saldo na carteira é
// decisão de negócio, não conserto de bug. Por isso a resposta devolve
// `comprador_pagou` — pra esse valor ficar na cara de quem cancelou.
import { exigirSessao } from '../_lib/sessao.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED = ['paid', 'preparando', 'saiu_entrega', 'entregue', 'cancelado'];
// Estados em que o comprador JÁ PAGOU — a partir daqui cancelar mexe em dinheiro.
// Mesma lista da trigger trg_sale_to_ledger (20260716_saldo_a_liberar.sql:47).
const JA_PAGO = ['paid', 'entregue', 'enviado', 'confirmado', 'pago', 'concluido', 'preparando', 'saiu_entrega'];

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
    const actorId = String(body?.actorId || '').trim();
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, actorId, 'updateOrderStatus');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    const saleId = String(body?.saleId || '').trim();
    const status = String(body?.status || '').trim();
    const carrier = body?.carrier != null ? String(body.carrier) : undefined;
    const tracking = body?.tracking != null ? String(body.tracking) : undefined;
    if (!actorId || !saleId || !ALLOWED.includes(status)) return res.status(400).json({ success: false, error: 'Parâmetros inválidos' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // guard: ator admin/super_admin OU vendedor do pedido
    const actorArr = await (await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    const saleArr = await (await sb(`catalog_sales?select=id,seller_id,status,total_amount&id=eq.${encodeURIComponent(saleId)}&limit=1`)).json();
    const sale = Array.isArray(saleArr) ? saleArr[0] : null;
    if (!sale) return res.status(200).json({ success: false, error: 'Pedido não encontrado' });
    const isAdmin = actor && ['admin', 'super_admin'].includes(actor.role);
    const isSeller = sale.seller_id && sale.seller_id === actorId;
    if (!isAdmin && !isSeller) return res.status(403).json({ success: false, error: 'Sem permissão' });

    // ─── 🔴 PONTO 99: cancelar venda paga é operação de DINHEIRO ──────────────
    if (status === 'cancelado') {
      const jaPago = JA_PAGO.includes(String(sale.status || '').toLowerCase());
      if (jaPago && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Pedido já pago só pode ser cancelado pelo administrador — o cancelamento estorna comissão e escrow.',
        });
      }
      // Desfaz o dinheiro numa transação só (a função é atômica e idempotente).
      //
      // 💳 PONTO 107 (21/08/2026) — `_devolver_ao_comprador: true`.
      // Cancelamento administrativo = o cliente pagou e a empresa FICOU com o
      // dinheiro. Devolver é obrigatório, senão a empresa retém valor que não é
      // dela. Foi o caso real do cliente Ronilson: pagou R$ 73,87, o produto não
      // existia (erro de estoque na loja), a logística cancelou e o dinheiro
      // ficou parado sem nenhum caminho de volta. Agora vira saldo livre na
      // carteira dele, pra escolher outro produto, com linha no extrato.
      //
      // ⚠️ O chargeback (mpWebhook.js) chama a MESMA função SEM esta flag, de
      // propósito: lá o dinheiro já voltou pelo cartão, e creditar a carteira
      // faria a empresa pagar DUAS VEZES.
      //
      // A função só devolve se a venda estava PAGA — pedido abandonado sem
      // pagamento não gera crédito nenhum.
      const rpc = await sb('rpc/cancelar_venda', {
        method: 'POST',
        body: JSON.stringify({
          _sale_id: saleId,
          _motivo: String(body?.motivo || 'Cancelado por ' + (isAdmin ? 'admin' : 'vendedor')),
          _devolver_ao_comprador: true,
        }),
      });
      if (!rpc.ok) {
        const t = await rpc.text();
        return res.status(200).json({ success: false, error: 'Falha ao estornar o cancelamento', details: t.slice(0, 200) });
      }
      const estorno = await rpc.json().catch(() => null);
      // A própria cancelar_venda() já gravou status='cancelado' — não precisa do PATCH.
      return res.status(200).json({ success: true, status: 'cancelado', estorno });
    }

    const patch = { status };
    // carrier/tracking só se as colunas existirem (best-effort, ignora erro de coluna)
    if (carrier !== undefined) patch.carrier = carrier;
    if (tracking !== undefined) patch.tracking_code = tracking;
    let r = await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
    if (!r.ok) {
      // provavelmente coluna carrier/tracking_code não existe → tenta só o status
      r = await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status }) });
    }
    if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: 'Falha ao atualizar', details: t.slice(0, 200) }); }
    return res.status(200).json({ success: true, status });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
