// consignadoSettle — MOTOR FINANCEIRO DO CONSIGNADO (regra oficial 08/08/2026).
//
// A regra em uma frase: A DÍVIDA MORRE NA VENDA.
//
// Quando uma peça consignada é vendida, o custo dela é cobrado NO ATO. Ninguém
// termina uma venda ainda devendo aquela peça. De onde sai o dinheiro depende de
// onde o dinheiro do cliente foi parar:
//
//   • PIX / CARTÃO  → o dinheiro passou pela plataforma. O custo é RETIDO ali
//                     mesmo ('retido_venda'): a dívida morre e nada é debitado
//                     do saldo dele.
//   • DINHEIRO / SALDO → o dinheiro ficou na mão dele. O custo é debitado do
//                     saldo de operação e, se faltar, do saldo de comissão.
//                     Sem cobertura, a VENDA NÃO FECHA (ver preverConsignado).
//
// Por isso quem trabalha com consignado precisa se antecipar e manter saldo:
// é o preço de andar com mercadoria que não é dele.
import { oid } from './oid.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// pagamentos em que o dinheiro do cliente passa pela plataforma
const PAGAMENTO_PELA_PLATAFORMA = ['pix', 'cartao', 'credit_card', 'card'];

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

/**
 * PRÉ-CHECAGEM — roda ANTES de gravar a venda e de baixar qualquer estoque.
 *
 * Simula a mesma ordem de baixa da casa (comprado → consignado) só para saber
 * quanto de mercadoria CONSIGNADA aquela venda vai consumir e quanto isso custa.
 * É esta função que trava a venda quando o custo não tem como ser pago.
 *
 * @returns {{ custo: number, precisaSaldo: boolean, ok: boolean, erro?: string, saldo?: number }}
 */
export async function preverConsignado({ ownerId, items, paymentMethod }) {
  const vazio = { custo: 0, precisaSaldo: false, ok: true };
  if (!ownerId || !Array.isArray(items) || !items.length) return vazio;

  const ids = [...new Set(items.map((i) => String(i.product_id || '')).filter(Boolean))];
  if (!ids.length) return vazio;
  const inList = ids.map((i) => `"${encodeURIComponent(i)}"`).join(',');

  const linhas = await (await sb(
    `store_inventory?select=product_id,quantity,origem,custo_unitario&owner_id=eq.${encodeURIComponent(ownerId)}&product_id=in.(${inList})`
  )).json();
  const lista = Array.isArray(linhas) ? linhas : [];
  if (!lista.length) return vazio;

  let custo = 0;
  for (const it of items) {
    const pid = String(it.product_id || '');
    if (!pid) continue;
    let restante = Math.max(1, Number(it.qty || it.quantity) || 1);

    // 1) o que ele já pagou (comprado) sai primeiro e não gera dívida
    for (const li of lista.filter((l) => l.product_id === pid && l.origem === 'comprado')) {
      if (restante <= 0) break;
      restante -= Math.min(Math.max(0, Number(li.quantity) || 0), restante);
    }
    // 2) o que sobrar puxa do consignado — e ISSO tem custo a pagar agora
    for (const li of lista.filter((l) => l.product_id === pid && l.origem === 'consignado')) {
      if (restante <= 0) break;
      const usar = Math.min(Math.max(0, Number(li.quantity) || 0), restante);
      custo = round2(custo + usar * (Number(li.custo_unitario) || 0));
      restante -= usar;
    }
  }

  if (custo <= 0) return vazio;

  // dinheiro passou pela plataforma: o custo fica retido lá, nada a checar
  if (PAGAMENTO_PELA_PLATAFORMA.includes(String(paymentMethod))) {
    return { custo, precisaSaldo: false, ok: true };
  }

  // dinheiro ficou com ele: o saldo TEM que cobrir o custo, senão a venda não sai
  const uArr = await (await sb(
    `app_users?select=id,saldo_operacao,commission_balance&id=eq.${encodeURIComponent(ownerId)}&limit=1`
  )).json();
  const u = Array.isArray(uArr) ? uArr[0] : null;
  const saldo = round2((Number(u?.saldo_operacao) || 0) + (Number(u?.commission_balance) || 0));

  if (saldo < custo) {
    return {
      custo, precisaSaldo: true, ok: false, saldo,
      erro: `Esta venda usa mercadoria consignada (custo R$ ${custo.toFixed(2)}). Como o cliente pagou em dinheiro, o custo sai do seu saldo — e você tem R$ ${saldo.toFixed(2)}. Faltam R$ ${(custo - saldo).toFixed(2)}: deposite antes de fechar, ou receba do cliente em PIX/cartão pelo app.`,
    };
  }
  return { custo, precisaSaldo: true, ok: true, saldo };
}

/**
 * LIQUIDAÇÃO — roda DEPOIS da baixa, com os consumos reais.
 * Mata a dívida de cada peça consignada que saiu nesta venda.
 *
 * @param consumos itens vindos de baixaEstoque.js (origem 'consignado' têm divida_unitaria)
 */
export async function liquidarConsignado({ sale, ownerId, consumos, paymentMethod }) {
  const consignados = (consumos || []).filter((c) => c.origem === 'consignado');
  if (!ownerId || !consignados.length) return { total: 0, linhas: 0 };

  const pelaPlataforma = PAGAMENTO_PELA_PLATAFORMA.includes(String(paymentMethod));
  const now = new Date().toISOString();
  let total = 0;
  const registros = [];

  for (const c of consignados) {
    const valor = round2(c.qty * (Number(c.divida_unitaria) || Number(c.custo_unitario) || 0));
    if (valor <= 0) continue;
    total = round2(total + valor);
    registros.push({
      id: oid(), sale_id: String(sale.id), owner_id: String(ownerId),
      product_id: String(c.product_id), quantidade: c.qty,
      custo_unitario: round2(c.custo_unitario), valor_quitado: valor,
      fonte: pelaPlataforma ? 'retido_venda' : 'saldo', created_at: now,
    });
  }
  if (!registros.length) return { total: 0, linhas: 0 };

  // 🔒 IDEMPOTÊNCIA: o índice único (sale_id, product_id) faz o banco recusar a
  // segunda cobrança da mesma venda. Se não gravou nada novo, ninguém paga de novo.
  const ins = await sb('consignado_liquidacoes', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(registros),
  });
  const gravados = ins.ok ? await ins.json() : [];
  if (!Array.isArray(gravados) || !gravados.length) return { total: 0, linhas: 0, ja_cobrado: true };

  const cobrar = round2(gravados.reduce((s, g) => s + (Number(g.valor_quitado) || 0), 0));

  // dinheiro na mão dele → debita do saldo (operação primeiro, depois comissão)
  if (!pelaPlataforma && cobrar > 0) {
    const uArr = await (await sb(
      `app_users?select=id,saldo_operacao,commission_balance,divida_consignado&id=eq.${encodeURIComponent(ownerId)}&limit=1`
    )).json();
    const u = Array.isArray(uArr) ? uArr[0] : null;
    const op = round2(u?.saldo_operacao);
    const com = round2(u?.commission_balance);
    const daOperacao = Math.min(op, cobrar);
    const daComissao = round2(cobrar - daOperacao);
    await sb(`app_users?id=eq.${encodeURIComponent(ownerId)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        saldo_operacao: round2(op - daOperacao),
        commission_balance: round2(Math.max(0, com - daComissao)),
      }),
    });
  }

  // abate a dívida viva do usuário e das linhas de estoque consignado
  const uArr2 = await (await sb(`app_users?select=id,divida_consignado&id=eq.${encodeURIComponent(ownerId)}&limit=1`)).json();
  const dividaAtual = round2(Array.isArray(uArr2) && uArr2[0] ? uArr2[0].divida_consignado : 0);
  await sb(`app_users?id=eq.${encodeURIComponent(ownerId)}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ divida_consignado: round2(Math.max(0, dividaAtual - cobrar)) }),
  });

  for (const c of consignados) {
    if (!c.inventory_id) continue;
    const liArr = await (await sb(`store_inventory?select=id,divida_aberta&id=eq.${encodeURIComponent(c.inventory_id)}&limit=1`)).json();
    const li = Array.isArray(liArr) ? liArr[0] : null;
    if (!li) continue;
    const abate = round2(c.qty * (Number(c.divida_unitaria) || Number(c.custo_unitario) || 0));
    await sb(`store_inventory?id=eq.${encodeURIComponent(c.inventory_id)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ divida_aberta: round2(Math.max(0, (Number(li.divida_aberta) || 0) - abate)) }),
    });
  }

  return { total: cobrar, linhas: gravados.length, fonte: pelaPlataforma ? 'retido_venda' : 'saldo' };
}