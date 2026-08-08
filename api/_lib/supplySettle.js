// supplySettle — LIQUIDAÇÃO DO PEDIDO DE REPOSIÇÃO (compra firme do lojista).
//
// A regra em uma frase: a mercadoria só sai do estoque central e entra no estoque
// da loja QUANDO O DINHEIRO ENTRA. Nunca antes.
//
// Chamado em dois momentos, nunca nos dois para o mesmo pedido:
//   • pagamento em SALDO  → createSupplyOrder chama aqui direto, logo após o débito
//   • PIX / CARTÃO        → mpWebhook chama aqui, depois do flip atômico da venda
//
// Idempotência: além do flip atômico do webhook, gravamos uma marca no próprio
// pedido (reposicao_settled). Se ela já existe, esta função não faz nada — assim
// nem retry de webhook nem reprocessamento manual duplicam estoque.
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
 * Baixa do estoque central e entrada no estoque da loja.
 * @param sale linha de catalog_sales com kind='reposicao'
 */
export async function aplicarReposicao(sale) {
  const lojaId = sale?.buyer_id;
  const raw = sale?.raw_base44 || {};
  if (!lojaId) return { ok: false, error: 'pedido sem loja' };
  if (raw.reposicao_settled) return { ok: true, ja_aplicado: true };

  const itens = Array.isArray(sale.items_json) ? sale.items_json : (raw.items || []);
  if (!itens.length) return { ok: false, error: 'pedido sem itens' };

  const now = new Date().toISOString();
  const aplicados = [];
  let creditoEstoque = 0;

  for (const it of itens) {
    const productId = String(it.product_id || '');
    const qty = Math.max(1, Number(it.qty || it.quantity) || 1);
    if (!productId) continue;

    // 1) baixa do estoque central
    const pArr = await (await sb(`products?select=id,quantity,price_catalog,status&id=eq.${encodeURIComponent(productId)}&limit=1`)).json();
    const p = Array.isArray(pArr) ? pArr[0] : null;
    if (!p) continue;
    const novaQtd = Math.max(0, (Number(p.quantity) || 0) - qty);
    await sb(`products?id=eq.${encodeURIComponent(productId)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ quantity: novaQtd, status: novaQtd > 0 ? 'ESTOQUE' : 'VENDIDO', updated_date: now }),
    });

    // 2) entrada no estoque da loja (soma se o item já existir lá)
    // ⚠️ preço herda o preço da casa: o lojista NUNCA define preço.
    // 🏷️ origem='comprado' + custo_unitario: é o que diz ao sistema que essa peça é
    // DELE e quanto devolver pra conta dele quando ela vender.
    const preco = round2(p.price_catalog || it.unit_cheio || 0);
    const custo = round2(it.unit || 0);
    const siArr = await (await sb(`store_inventory?select=id,quantity,custo_unitario&owner_id=eq.${encodeURIComponent(lojaId)}&product_id=eq.${encodeURIComponent(productId)}&origem=eq.comprado&limit=1`)).json();
    const si = Array.isArray(siArr) ? siArr[0] : null;
    if (si) {
      const qtdAnterior = Number(si.quantity) || 0;
      const total = qtdAnterior + qty;
      // custo médio: compras em datas/preços diferentes não podem sobrescrever o custo antigo
      const custoMedio = total > 0 ? round2(((Number(si.custo_unitario) || 0) * qtdAnterior + custo * qty) / total) : custo;
      await sb(`store_inventory?id=eq.${encodeURIComponent(si.id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ quantity: total, active: true, price: preco, custo_unitario: custoMedio, updated_at: now }),
      });
    } else {
      await sb('store_inventory', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ id: oid(), owner_id: lojaId, product_id: productId, quantity: qty, active: true, price: preco, origem: 'comprado', custo_unitario: custo }),
      });
    }
    creditoEstoque = round2(creditoEstoque + custo * qty);
    aplicados.push({ product_id: productId, qty, custo_unitario: custo });
  }

  // 💰 CRÉDITO DE ESTOQUE (travado): o valor pago volta pra conta dele como lastro.
  // Não saca e não compra — vai destravando conforme a mercadoria vende.
  if (creditoEstoque > 0) {
    const uArr = await (await sb(`app_users?select=id,credito_estoque&id=eq.${encodeURIComponent(lojaId)}&limit=1`)).json();
    const atual = round2(Array.isArray(uArr) && uArr[0] ? uArr[0].credito_estoque : 0);
    await sb(`app_users?id=eq.${encodeURIComponent(lojaId)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ credito_estoque: round2(atual + creditoEstoque) }),
    });
  }

  // marca o pedido como liquidado (trava de idempotência)
  await sb(`catalog_sales?id=eq.${encodeURIComponent(sale.id)}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ raw_base44: { ...raw, reposicao_settled: true, reposicao_settled_at: now } }),
  });

  return { ok: true, itens_aplicados: aplicados.length, detalhes: aplicados, credito_estoque: creditoEstoque };
}