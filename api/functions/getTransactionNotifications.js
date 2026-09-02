// getTransactionNotifications — eventos de transação do usuário para os popups em tela.
// Retorna as últimas transações PAGAS onde o usuário é comprador (compra confirmada),
// vendedor/licenciado (venda realizada) ou beneficiário de comissão (comissão recebida).
// O cliente deduplica por id (localStorage) e só exibe o que ainda não viu.
//
// ══════════════════════════════════════════════════════════════════════════════
// 🔴 02/09/2026 — "COMISSÃO RECEBIDA · 100% DE COMISSÃO" QUE NÃO ERA COMISSÃO
// ══════════════════════════════════════════════════════════════════════════════
// O dono viu na tela três avisos "COMISSÃO RECEBIDA" e perguntou se era real.
// Não era. Esta rota lia o `commission_ledger` inteiro e chamava TUDO de
// comissão — mas 100% do que existe lá (480 linhas, R$ 68.929,74) é a linha de
// ESCROW gravada pela trigger trg_sale_to_ledger: o valor CHEIO da venda,
// segurado no nome do próprio VENDEDOR até a data de liberação. Daí o "100% de
// comissão": o `pct` da linha de escrow é literalmente 100.
//
// Duas correções, nesta ordem:
//   1. escrow para de ser anunciado como comissão (filtro role_in_sale <> 'venda');
//   2. quem avisa o vendedor da venda passa a ser o evento "Venda realizada" —
//      que já existia aqui, mas nunca disparou: filtrava `status = 'paid'`, e
//      'paid' em catalog_sales hoje só marca depósito de carteira/passaporte,
//      nunca venda de produto (essas ficam em 'entregue'). Ver api/_lib/statusVenda.js.
//
// Efeito: o aviso errado some e o certo passa a aparecer, com o valor da venda
// no lugar de um "100% de comissão" que nunca existiu.
import { exigirSessao } from '../_lib/sessao.js';
import { STATUS_VENDA_PAGA, KINDS_NAO_COMPRA, ehEscrow } from '../_lib/statusVenda.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    const userId = String(body?.user_id || '').trim();
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, userId, 'getTransactionNotifications');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    if (!userId) return res.status(400).json({ success: false, error: 'Usuário obrigatório', events: [] });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente', events: [] });

    const uid = encodeURIComponent(userId);
    // depósitos de carteira NÃO são compra — ficam fora das notificações de transação
    const notDeposit = `kind=not.in.(${KINDS_NAO_COMPRA.join(',')})`;
    // ⚠️ NÃO trocar por `status=eq.paid`: era o filtro antigo e casava com ZERO
    // venda de produto — 'paid' aqui só marca depósito, que o notDeposit já corta.
    const pago = `status=in.(${STATUS_VENDA_PAGA.join(',')})`;
    // 🕐 Aviso de transação é popup de "acabou de acontecer", não caixa de entrada.
    // Sem esta janela, o primeiro polling depois deste deploy despejaria na tela
    // vendas de semanas atrás: o cliente só ignora o histórico quando o
    // localStorage está vazio (`firstRun`), e quem já viu os avisos de escrow tem
    // o localStorage cheio — para essas pessoas os ids `sell-`/`buy-` seriam
    // todos novos de uma vez. 24h cobre quem abre o app no dia seguinte.
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const janela = `created_date=gte.${encodeURIComponent(desde)}`;
    const saleSelect = 'id,kind,product_title,product_image,total_amount,sale_price,buyer_id,buyer_name,seller_id,created_date';
    // No commission_ledger, `or=` mantém papel NULO como comissão: só o 'venda'
    // (escrow) é descartado. `neq` sozinho descartaria os nulos junto.
    const semEscrow = 'or=(role_in_sale.is.null,role_in_sale.neq.venda)';
    const [buysR, sellsR, commsR] = await Promise.all([
      sb(`catalog_sales?select=${saleSelect}&buyer_id=eq.${uid}&${pago}&${notDeposit}&${janela}&order=created_date.desc&limit=10`),
      sb(`catalog_sales?select=${saleSelect}&seller_id=eq.${uid}&${pago}&${notDeposit}&${janela}&order=created_date.desc&limit=10`),
      sb(`commission_ledger?select=created_at,amount,pct,role_in_sale&beneficiary_id=eq.${uid}&${semEscrow}&order=created_at.desc&limit=10`),
    ]);
    const buys = await buysR.json();
    const sells = await sellsR.json();
    const comms = await commsR.json();

    const events = [];
    for (const s of Array.isArray(buys) ? buys : []) {
      events.push({
        id: `buy-${s.id}`, type: 'purchase',
        title: 'Compra confirmada',
        product: s.product_title || 'Pedido', image: s.product_image || null,
        amount: Number(s.total_amount) || Number(s.sale_price) || 0,
        date: s.created_date,
      });
    }
    for (const s of Array.isArray(sells) ? sells : []) {
      if (s.buyer_id === userId) continue; // não notifica venda de si mesmo
      events.push({
        id: `sell-${s.id}`, type: 'sale',
        title: 'Venda realizada',
        product: s.product_title || 'Produto', image: s.product_image || null,
        buyer: s.buyer_name || null,
        amount: Number(s.total_amount) || Number(s.sale_price) || 0,
        date: s.created_date,
      });
    }
    for (const c of Array.isArray(comms) ? comms : []) {
      // Segunda tranca, de propósito: se algum dia o filtro da consulta se perder
      // num refactor, escrow ainda não vira "comissão recebida" na tela de ninguém.
      if (ehEscrow(c.role_in_sale)) continue;
      events.push({
        id: `comm-${c.created_at}-${c.amount}`, type: 'commission',
        title: 'Comissão recebida',
        product: c.pct ? `${c.pct}% de comissão` : 'Comissão da rede', image: null,
        amount: Number(c.amount) || 0,
        date: c.created_at,
      });
    }

    events.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return res.status(200).json({ success: true, events: events.slice(0, 20) });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e), events: [] });
  }
}
