// payWithBalance — compra paga com o saldo da carteira do próprio usuário.
//
// 💳 16/09/2026 — DUAS CARTEIRAS, NÃO UMA. Antes só gastava `commission_balance`
// (comissão de vendedor). Agora gasta também `saldo_disponivel`, o crédito de
// participação do leilão — que é o que o Termo de Adesão, cláusula 5, promete:
// "o saldo permanece integralmente na carteira ... e pode ser usado na Loja
// Virtual". Ordem de consumo: DEPÓSITO primeiro, comissão depois (a comissão é
// sacável em dinheiro, o depósito não é — ver a migração 20260916160000).
//
// Toda a validação (preço, estoque, saldo) e a baixa acontecem ATÔMICAS na função
// SQL comprar_com_saldo. Aqui só o frete é reservado antes, porque ele é cotado
// fora do banco.
import { fulfillStoreOrder } from '../_lib/storeFulfill.js';
import { resolverFreteDoCheckout } from '../_lib/frete.js';
import { registrarReceita } from '../_lib/financialIncome.js';
// 🔴 a trava dos três estados: dinheiro disputando leilão vivo não compra na loja
import { compromissoEmLeiloes } from '../_lib/compromissoLeilao.js';

import { exigirSessao } from '../_lib/sessao.js';
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Coluna nunca inicializada fica NULL, e `eq.0` nunca casa com NULL no Postgres —
// mesmo tratamento de api/functions/requestWithdrawal.js e api/_lib/bidHold.js.
const filtroCAS = (coluna, valor) => (valor === 0
  ? `or(${coluna}.eq.0,${coluna}.is.null)`
  : `${coluna}.eq.${valor}`);

// Move as DUAS carteiras de uma vez, com CAS nas duas colunas: o PATCH só aplica
// se nenhuma delas mudou desde a leitura. Se alguém mexeu no meio, relê e tenta.
async function moverCarteirasCAS(userId, deltaDeposito, deltaComissao) {
  for (let i = 0; i < 6; i++) {
    const rows = await (await sb(`app_users?select=saldo_disponivel,commission_balance&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
    const u = Array.isArray(rows) ? rows[0] : null;
    if (!u) return { ok: false, error: 'usuario_nao_encontrado' };
    const dep = round2(u.saldo_disponivel);
    const com = round2(u.commission_balance);
    const novoDep = round2(dep + deltaDeposito);
    const novoCom = round2(com + deltaComissao);
    if (novoDep < 0 || novoCom < 0) return { ok: false, error: 'saldo_insuficiente', saldo: round2(dep + com) };
    const patch = await sb(
      `app_users?id=eq.${encodeURIComponent(userId)}&and=(${filtroCAS('saldo_disponivel', dep)},${filtroCAS('commission_balance', com)})`,
      { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ saldo_disponivel: novoDep, commission_balance: novoCom }) },
    );
    const upd = await patch.json().catch(() => []);
    if (Array.isArray(upd) && upd.length) return { ok: true, deposito: novoDep, comissao: novoCom };
  }
  return { ok: false, error: 'conflito_de_saldo' };
}

/**
 * Reserva o frete gastando DEPÓSITO primeiro e comissão só no que sobrar —
 * a mesma ordem da compra, senão o frete queimaria o dinheiro sacável.
 * Devolve a repartição para que o estorno, se precisar, seja exato.
 */
async function reservarFrete(userId, valor, comprometido) {
  const rows = await (await sb(`app_users?select=saldo_disponivel,commission_balance&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
  const u = Array.isArray(rows) ? rows[0] : null;
  if (!u) return { ok: false, error: 'usuario_nao_encontrado' };
  // 🔴 o que está disputando leilão vivo não paga frete de compra na loja
  const livreDeposito = Math.max(0, round2(round2(u.saldo_disponivel) - round2(comprometido)));
  const doDeposito = round2(Math.min(livreDeposito, valor));
  const daComissao = round2(valor - doDeposito);
  if (daComissao > round2(u.commission_balance)) return { ok: false, error: 'saldo_insuficiente', saldo: round2(livreDeposito + round2(u.commission_balance)) };
  const r = await moverCarteirasCAS(userId, -doDeposito, -daComissao);
  return r.ok ? { ok: true, doDeposito, daComissao } : r;
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
function rpc(fn, args) {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const buyerId = String(body?.buyer_id || '').trim();

    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, buyerId, 'payWithBalance');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!buyerId) return res.status(400).json({ success: false, error: 'Usuário obrigatório' });
    if (!items.length) return res.status(400).json({ success: false, error: 'Carrinho vazio' });

    // normaliza itens -> [{product_id, qty}]
    const cleanItems = items
      .map((it) => ({ product_id: String(it.product_id || it.id || '').trim(), qty: Math.max(1, parseInt(it.quantity || it.qty || 1, 10) || 1) }))
      .filter((it) => it.product_id);
    if (!cleanItems.length) return res.status(400).json({ success: false, error: 'Itens inválidos' });

    // resolve o seller (loja) pra atribuição/envio: prioridade ref_code do link, senão o RPC decide
    let sellerId = body?.seller_id ? String(body.seller_id) : null;
    const refCode = String(body?.ref_code || '').trim();
    if (!sellerId && refCode) {
      const r = await (await sb(`app_users?select=id&referral_code=eq.${encodeURIComponent(refCode)}&limit=1`)).json();
      if (Array.isArray(r) && r[0]) sellerId = r[0].id;
    }

    // 🚚 PONTO 74 — frete RECOTADO no servidor. Reservamos o frete ANTES do RPC (CAS) e
    // devolvemos se a compra falhar: assim o saldo nunca fica pago pela metade.
    // 🔴 21/09/2026 — ESTE VALOR PRECISA SOBREVIVER ATÉ O BANCO.
    // Antes ele era calculado DENTRO da chamada abaixo, usado para cotar o
    // frete, e jogado fora. Quem gera a etiqueta lê `raw_base44.delivery_type`
    // e trata a AUSÊNCIA como retirada no balcão — então todo pedido pago com
    // saldo virava "retirada na loja" na hora de imprimir, mesmo com o frete
    // pago e o CEP na mão. Cinco pedidos travados entre 10 e 20/09, e ninguém
    // soube: 'retirada_na_loja' está na lista de pulos que não geram log.
    const entrega = body?.delivery_type || (body?.buyer_address === 'Retirada' ? 'pickup' : 'delivery');
    const fr = await resolverFreteDoCheckout({
      delivery_type: entrega,
      cep: body?.buyer_cep,
      items: cleanItems,
      frete_id: body?.frete_id,
    });
    if (!fr.ok) return res.status(200).json({ success: false, error: fr.error });
    const frete = fr.frete;
    // 🔴 calculado UMA vez e usado no frete; a compra recalcula por dentro do
    // `for update` (ver a migração), que é onde não pode haver janela.
    let comprometido = 0;
    try { comprometido = await compromissoEmLeiloes(buyerId); } catch (_) { comprometido = 0; }

    let freteDoDeposito = 0; let freteDaComissao = 0;
    if (frete.valor > 0) {
      const rv = await reservarFrete(buyerId, frete.valor, comprometido);
      if (rv.ok) { freteDoDeposito = rv.doDeposito; freteDaComissao = rv.daComissao; }
      if (!rv.ok) {
        return res.status(200).json({
          success: false,
          error: rv.error === 'saldo_insuficiente' ? 'Saldo insuficiente para cobrir o frete.' : 'Não foi possível reservar o frete agora.',
          saldo: rv.saldo,
        });
      }
    }

    const r = await rpc('comprar_com_saldo', {
      _buyer: buyerId,
      _items: cleanItems,
      _seller: sellerId,
      _buyer_name: body?.buyer_name || null,
      _buyer_phone: body?.buyer_phone ? String(body.buyer_phone).replace(/\D/g, '') : null,
      _address: body?.buyer_address || null,
      _cep: body?.buyer_cep ? String(body.buyer_cep).replace(/\D/g, '') : null,
      _coupon: body?.coupon_code ? String(body.coupon_code) : null,
    });
    const out = await r.json();
    const data = Array.isArray(out) ? out[0] : out; // rpc retorna o json direto

    if (!data || data.ok !== true) {
      // compra não passou → devolve o frete EXATAMENTE de onde ele saiu
      if (frete.valor > 0) await moverCarteirasCAS(buyerId, freteDoDeposito, freteDaComissao);
      return res.status(200).json({ success: false, error: data?.error || 'Não foi possível concluir', saldo: data?.saldo, total: data?.total });
    }

    // registra o tipo de entrega e o frete cobrado na venda (fora de
    // total_amount, que é a base da comissão)
    //
    // 🔴 ESTA GRAVAÇÃO NÃO PODE FICAR DENTRO DE `if (frete.valor > 0)`.
    // O `delivery_type` existe mesmo quando não há frete a cobrar — frete
    // grátis é entrega, não retirada — e era justamente o pedido sem frete que
    // saía do checkout sem nenhum `raw_base44` e caía no mesmo buraco.
    try {
      const cur = await (await sb(`catalog_sales?select=raw_base44,total_amount&id=eq.${encodeURIComponent(data.sale_id)}&limit=1`)).json();
      const base = (Array.isArray(cur) && cur[0]?.raw_base44) || {};
      const novo = { ...base, delivery_type: entrega };
      if (frete.valor > 0) {
        novo.frete = frete;
        novo.amount_charged = round2(Number(cur?.[0]?.total_amount || data.total) + frete.valor);
        novo.frete_pago_com = { deposito: freteDoDeposito, comissao: freteDaComissao };
      }
      await sb(`catalog_sales?id=eq.${encodeURIComponent(data.sale_id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ raw_base44: novo }),
      });
    } catch (_) { /* frete já debitado; registro é secundário */ }

    // conclui como venda de loja: comissão pro DONO da loja (modelo marketplace) + fulfillment.
    // Mesma rota de uma venda PIX paga (kind='loja' → fulfillStoreOrder no webhook).
    let commission = 0;
    try {
      const saleArr = await (await sb(`catalog_sales?select=*&id=eq.${encodeURIComponent(data.sale_id)}&limit=1`)).json();
      const sale = Array.isArray(saleArr) ? saleArr[0] : null;
      if (sale && !Number(sale.commission_total)) {
        const r = await fulfillStoreOrder(sale);
        commission = r?.commission || 0;
      }
    } catch (e) { console.error('fulfillStoreOrder (saldo) falhou:', e?.message || e); }
    // 💰 DIR-13 — compra com saldo de comissão nunca passa pelo webhook do
    // Mercado Pago: sem isto, essa comissão real nunca chegava a financial_income.
    if (commission > 0) {
      await registrarReceita({ description: `Comissão — venda #${data.sale_id}`, category: 'comissao_loja', costCenter: 'Loja Virtual', amount: commission, source: 'venda', saleId: data.sale_id });
    }

    // novo_saldo já vem descontado do frete (a reserva aconteceu ANTES do RPC)
    return res.status(200).json({
      success: true, sale_id: data.sale_id, total: data.total, shipping: frete.valor,
      total_cobrado: round2(Number(data.total || 0) + frete.valor),
      novo_saldo: data.novo_saldo, tracking: data.tracking, commission,
      // 💳 de onde saiu o dinheiro — a tela mostra, e o suporte confere depois
      pago_com_deposito: round2(Number(data.pago_com_deposito || 0) + freteDoDeposito),
      pago_com_comissao: round2(Number(data.pago_com_comissao || 0) + freteDaComissao),
      saldo_deposito: data.saldo_deposito, saldo_comissao: data.saldo_comissao,
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}