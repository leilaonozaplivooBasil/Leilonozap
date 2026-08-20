// Helper (não é rota — pasta _lib é ignorada pela Vercel): conclui um pedido ONLINE de loja
// quando o pagamento confirma. Baixa o estoque DA LOJA e paga a comissão pela ÁRVORE OFICIAL (30%).
// Idempotência fica por conta do webhook (só chama 1x).
import { calcularComissao } from './arvoreOficial.js';
import { oid } from './oid.js';
// 📦 regra ÚNICA de baixa (estoque próprio do vendedor tem prioridade sobre o central)
import { baixarItensDaVenda } from './baixaEstoque.js';
import { liberarRepasseEstoqueProprio } from './repasseEstoqueProprio.js';
// 🤝 venda ONLINE: o cliente pagou pela plataforma, então o custo da peça
// consignada é retido aqui mesmo e a dívida morre — sem tocar no saldo do lojista.
import { liquidarConsignado } from './consignadoSettle.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

// 💰 Comissão pela ÁRVORE OFICIAL (30%) — api/_lib/arvoreOficial.js.
// TOPO (10%): governança + gestão recebem SEMPRE, pelo cargo (inclusive na venda orgânica).
// CADEIA (20%): operação + comercial só recebem se estiverem na cadeia da venda; sem dono, empresa.
// ⚠️ sem seller_id (venda orgânica) NÃO retorna zero: o topo tem que receber.
async function payStoreCommissions(sale) {
  // 🔴 PONTO 97 (21/08/2026) — LEILÃO NÃO É LOJA. A auditoria geral confirmou
  // vazamento de dinheiro REAL e SACÁVEL em todo arremate.
  //
  // O que acontecia: o martelo paga corretamente 5% ao indicador do arrematante
  // (finalizeAuctionCore.js:192 — e o comentário lá é explícito: "Paga no
  // MARTELO e está correto... NÃO mover este gatilho para o fluxo de
  // pagamento"). Só que DEPOIS, quando o vencedor pagava, a venda com
  // kind:'arremate' era jogada aqui dentro, no motor de 30% da LOJA, que solta
  // ~9% em pools de governança — e esses pools não dependem de cadeia, então
  // pagam SEMPRE. Num arremate de R$ 1.000 saíam R$ 140 em vez de R$ 50.
  //
  // 📕 docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md:214 — "O LEILÃO NÃO SEGUE A
  // REGRA DA LOJA VIRTUAL. São modelos diferentes. Não aplicar aqui os 30% /
  // cadeia telescópica / pools do topo." Linha 222: "Restante: fica
  // integralmente com a empresa."
  //
  // A guarda fica AQUI, e não no chamador, de propósito: os DOIS caminhos de
  // pagamento do arremate (saldo, settleAuctionWithBalance.js:179; e PIX, no
  // fall-through de mpWebhook.js:239) passam por esta função. Uma trava só
  // fecha os dois — sem precisar editar arquivo de zona vermelha.
  //
  // ⚠️ Só a COMISSÃO é bloqueada. O resto do fulfillStoreOrder (baixa de
  // estoque, consignado, repasse de estoque próprio) segue rodando normal no
  // arremate — aquilo é logística e acerto de custo, não comissão.
  if (sale.kind === 'arremate') return 0;

  const value = Number(sale.total_amount) || 0;
  if (!value) return 0;

  // 🔒 Guarda de idempotência: se JÁ existe comissão pra esta venda, não paga de novo.
  // Protege contra qualquer caminho que chame isto 2x (webhook em corrida, retry, etc.).
  const jaTem = await (await sb(`commission_records?select=id&sale_id=eq.${encodeURIComponent(sale.id)}&limit=1`)).json();
  if (Array.isArray(jaTem) && jaTem.length) return 0;

  // 🔴 PONTO 105 (21/08/2026): aqui havia um `&active=neq.false`, com a intenção
  // certa ("conta desativada, ex. duplicata, NÃO entra nos pools") e um efeito
  // colateral grave: esta lista vira o `byId` que a árvore usa pra SUBIR pelo
  // referred_by_id. Uma conta arquivada no meio da linha fazia a caminhada PARAR
  // ali, e todo mundo acima perdia a comissão daquela venda — calado, com o
  // dinheiro indo pra empresa.
  // Agora carregamos TODO MUNDO (com a coluna `active` junto) e quem decide quem
  // recebe é o motor, em api/_lib/arvoreOficial.js. A conta arquivada virou
  // pedágio: a cadeia passa por ela, ela é que não ganha.
  const users = await (await sb('app_users?select=id,full_name,career_levels,referred_by_id,licenciado_context,active&limit=5000')).json();
  if (!Array.isArray(users) || !users.length) return 0;
  const { assignments, companyPercent, companyAmount } = calcularComissao(sale, users);

  const anchor = users.find((u) => u.id === sale.seller_id) || null;
  const site = users.find((u) => u.full_name === 'Leilão NoZap - Site Oficial');
  const now = new Date().toISOString();
  const linhas = [];
  let total = 0;

  for (const a of assignments) {
    const id = oid();
    linhas.push({
      id, base44_id: id, sale_id: sale.id, user_id: a.user_id, user_name: a.user_name, role: a.role,
      percent: Math.round(a.percent * 1000) / 1000, amount: a.amount, sale_amount: value,
      sale_type: 'catalog', status: 'confirmed', product_title: sale.product_title || null,
      anchor_user_id: anchor?.id || null, anchor_user_name: anchor?.full_name || null, created_date: now,
    });
    total += a.amount;
  }
  if (companyAmount > 0 && site) {
    const id = oid();
    linhas.push({
      id, base44_id: id, sale_id: sale.id, user_id: site.id, user_name: site.full_name, role: 'empresa_rollup',
      percent: Math.round(companyPercent * 1000) / 1000, amount: companyAmount, sale_amount: value,
      sale_type: 'catalog', status: 'confirmed', product_title: sale.product_title || null,
      anchor_user_id: anchor?.id || null, anchor_user_name: anchor?.full_name || null, created_date: now,
    });
  }

  if (linhas.length) {
    await sb('commission_records', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(linhas) });
  }
  // crédito ATÔMICO por pessoa (commission_balance += amount no banco)
  // 💸 CRÉDITO CONFERIDO (correção 08/08/2026): antes o crédito era disparado sem olhar
  // o retorno. Se um falhasse, o commission_record existia mas o saldo NÃO caía — e a
  // guarda de idempotência (sale_id) impedia qualquer reprocessamento. Dinheiro que
  // aparecia no extrato e nunca no saldo, em silêncio. Agora o que não cai é marcado
  // como 'pending' na venda e pode ser reprocessado depois SEM pagar em dobro.
  const porPessoa = {};
  for (const a of assignments) porPessoa[a.user_id] = round2((porPessoa[a.user_id] || 0) + a.amount);
  // 🏦 PONTO 100 (21/08/2026, decisão do dono) — A FATIA SEM DONO AGORA É PAGA.
  // Até aqui a linha 'empresa_rollup' era gravada em commission_records e o saldo
  // NUNCA era creditado: uma linha morta. Pior, isso quebrava o
  // recalculateCommissionBalances — ele reescreve o saldo somando os records, e
  // recalcular criava do nada, na conta oficial, um saldo que nunca existiu.
  // Agora registro e saldo andam juntos, igual a todo mundo, e igual ao que o
  // leilão passou a fazer com a fatia retida (finalizeAuctionCore, PONTO 100).
  //
  // ⚠️ DE PROPÓSITO FORA DO `total` E DO LOOP ABAIXO. O `total` vira o
  // comissaoTotal de liberarRepasseEstoqueProprio, onde
  // `margem = bruto - comissao - custo` (repasseEstoqueProprio.js:50). Somar a
  // fatia da empresa ali faria o LOJISTA receber menos — a fatia sem dono sai da
  // parte da plataforma, nunca do bolso de quem vendeu.
  if (companyAmount > 0 && site) {
    try {
      const res = await sb('rpc/credit_commission', { method: 'POST', body: JSON.stringify({ _user: site.id, _amount: companyAmount }) });
      if (!res.ok) {
        await sb(`commission_records?sale_id=eq.${encodeURIComponent(sale.id)}&role=eq.empresa_rollup`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'pending' }),
        });
        console.error(`[LOJA] Fatia da empresa NÃO creditada (marcada como pendente): venda ${sale.id}, R$ ${companyAmount}`);
      }
    } catch (e) {
      console.error(`[LOJA] Erro ao creditar fatia da empresa na venda ${sale.id}:`, e?.message);
    }
  }
  for (const [uid, amount] of Object.entries(porPessoa)) {
    if (amount <= 0.001) continue;
    let ok = false;
    try {
      const res = await sb('rpc/credit_commission', { method: 'POST', body: JSON.stringify({ _user: uid, _amount: amount }) });
      ok = res.ok;
    } catch (_) { ok = false; }
    if (!ok) {
      total = round2(total - amount);
      await sb(`commission_records?sale_id=eq.${encodeURIComponent(sale.id)}&user_id=eq.${encodeURIComponent(uid)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'pending' }),
      });
      console.error(`[LOJA] Comissão NÃO creditada (marcada como pendente): venda ${sale.id}, pessoa ${uid}, R$ ${amount}`);
    }
  }
  return round2(total);
}

export async function fulfillStoreOrder(sale) {
  const now = new Date().toISOString();
  // baixa o estoque da loja item a item (qty=0 → inativo)
  let items = sale.items_json;
  if (typeof items === 'string') { try { items = JSON.parse(items); } catch { items = []; } }
  items = Array.isArray(items) ? items : [];
  // venda de item único (checkout direto / arremate) não tem items_json — usa o product_id da venda
  // ⚠️ o `unit` precisa vir junto: sem ele o repasse calcularia margem sobre zero
  // e o lojista receberia só o custo de volta, sem o lucro dele.
  if (!items.length && sale.product_id) {
    const q = Number(sale.quantity) || 1;
    items = [{ product_id: sale.product_id, qty: q, unit: round2((Number(sale.sale_price) || (Number(sale.total_amount) || 0) / q)) }];
  }
  // PDV já baixou o estoque item a item na hora da venda — não baixar de novo
  if (sale.skipStock) items = [];
  // 📦 baixa pela regra única: primeiro o estoque PRÓPRIO do vendedor
  // (comprado → consignado), só depois o estoque central.
  let consumos = [];
  if (items.length) {
    const r = await baixarItensDaVenda({ ownerId: sale.seller_id, items });
    consumos = r.consumos;
  }
  const baixados = items.length;
  const commission = await payStoreCommissions(sale);
  // 🤝 peça consignada vendida online: dívida morre, retida no pagamento
  if (consumos.some((c) => c.origem === 'consignado')) {
    try {
      await liquidarConsignado({ sale, ownerId: sale.seller_id, consumos, paymentMethod: 'pix' });
    } catch (e) {
      console.error(`[LOJA] Liquidação de consignado falhou na venda ${sale.id}:`, e?.message);
    }
  }
  // 💸 o que era do lojista volta pra conta dele (custo destravado + margem)
  if (consumos.length) {
    try {
      await liberarRepasseEstoqueProprio({ sale, ownerId: sale.seller_id, consumos, comissaoTotal: commission });
    } catch (e) {
      console.error(`[LOJA] Repasse de estoque próprio falhou na venda ${sale.id}:`, e?.message);
    }
  }
  await sb(`catalog_sales?id=eq.${sale.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_total: commission, fulfillment_status: 'a_enviar' }) });
  return { loja: true, baixados, commission };
}