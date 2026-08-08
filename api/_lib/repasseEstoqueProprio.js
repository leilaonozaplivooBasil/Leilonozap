// repasseEstoqueProprio — O DINHEIRO DO ESTOQUE PRÓPRIO VOLTA PRO DONO (08/08/2026).
//
// Quando o lojista compra estoque antecipado, o valor pago fica na conta dele como
// CRÉDITO DE ESTOQUE (travado — não saca, não compra). A cada venda paga daquela
// peça, esta função:
//   • destrava o custo da peça e credita no saldo livre dele (commission_balance);
//   • credita também a MARGEM (valor cheio − comissão proporcional − custo);
//   • no consignado, abate a dívida antes de liberar o que sobrar.
//
// A comissão da estrutura NÃO passa por aqui: ela já foi calculada e paga pelo
// motor oficial (arvoreOficial). Aqui só entra o que é do dono da mercadoria.
//
// Idempotência: uma linha em store_payouts por (venda, produto). Se já existe,
// nada é creditado de novo — nem em retry de webhook, nem em reprocessamento.
import { oid } from './oid.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

/**
 * @param sale        venda (id, product_title, total_amount)
 * @param ownerId     dono do estoque (quem recebe)
 * @param consumos    saída de baixaEstoque (só estoque próprio)
 * @param comissaoTotal comissão já paga pela estrutura nesta venda
 */
export async function liberarRepasseEstoqueProprio({ sale, ownerId, consumos, comissaoTotal = 0 }) {
  if (!ownerId || !Array.isArray(consumos) || !consumos.length) return { ok: true, nada: true };

  // trava de idempotência por venda
  const ja = await (await sb(`store_payouts?select=id&sale_id=eq.${encodeURIComponent(sale.id)}&limit=1`)).json();
  if (Array.isArray(ja) && ja.length) return { ok: true, ja_liberado: true };

  const totalVenda = round2(sale.total_amount) || round2(consumos.reduce((s, c) => s + c.unit * c.qty, 0));
  const linhas = [];
  let creditoLiberado = 0, margemTotal = 0, dividaAbatida = 0, totalCreditar = 0;

  for (const c of consumos) {
    const bruto = round2(c.unit * c.qty);
    const custo = round2(c.custo_unitario * c.qty);
    // comissão proporcional ao peso desta peça dentro da venda
    const comissao = totalVenda > 0 ? round2((Number(comissaoTotal) || 0) * (bruto / totalVenda)) : 0;
    const margem = round2(bruto - comissao - custo);

    let creditar = 0, divida = 0, custoLiberado = 0;
    if (c.origem === 'consignado') {
      // consignado: a peça ainda não foi paga — o custo quita a dívida
      divida = custo;
      creditar = Math.max(0, margem);
    } else {
      custoLiberado = custo;
      creditar = round2(custo + Math.max(0, margem));
    }

    creditoLiberado = round2(creditoLiberado + custoLiberado);
    margemTotal = round2(margemTotal + Math.max(0, margem));
    dividaAbatida = round2(dividaAbatida + divida);
    totalCreditar = round2(totalCreditar + creditar);

    const id = oid();
    linhas.push({
      id, sale_id: sale.id, product_id: c.product_id, product_title: c.title || sale.product_title || null,
      owner_id: ownerId, origem: c.origem, quantity: c.qty,
      custo: custoLiberado, comissao, margem: Math.max(0, margem),
      divida_abatida: divida, total_creditado: creditar, status: 'pago',
    });
  }

  if (totalCreditar <= 0 && creditoLiberado <= 0) return { ok: true, nada: true };

  // 1) destrava o crédito de estoque (nunca abaixo de zero)
  if (creditoLiberado > 0) {
    const uArr = await (await sb(`app_users?select=id,credito_estoque&id=eq.${encodeURIComponent(ownerId)}&limit=1`)).json();
    const atual = round2(Array.isArray(uArr) && uArr[0] ? uArr[0].credito_estoque : 0);
    await sb(`app_users?id=eq.${encodeURIComponent(ownerId)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ credito_estoque: round2(Math.max(0, atual - creditoLiberado)) }),
    });
  }

  // 2) credita no saldo livre (mesma RPC atômica da comissão)
  let creditoOk = true;
  if (totalCreditar > 0) {
    try {
      const r = await sb('rpc/credit_commission', { method: 'POST', body: JSON.stringify({ _user: ownerId, _amount: totalCreditar }) });
      creditoOk = r.ok;
    } catch (_) { creditoOk = false; }
  }
  if (!creditoOk) {
    linhas.forEach((l) => { l.status = 'pending'; });
    console.error(`[ESTOQUE PRÓPRIO] Repasse NÃO creditado (pendente): venda ${sale.id}, dono ${ownerId}, R$ ${totalCreditar}`);
  }

  // 3) rastro (a trava por venda+produto no banco também barra duplicidade)
  await sb('store_payouts', {
    method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(linhas),
  });

  return { ok: true, creditado: creditoOk ? totalCreditar : 0, custo: creditoLiberado, margem: margemTotal, divida_abatida: dividaAbatida, pendente: !creditoOk };
}