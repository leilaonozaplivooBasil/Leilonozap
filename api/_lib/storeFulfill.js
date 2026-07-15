// Helper (não é rota — pasta _lib é ignorada pela Vercel): conclui um pedido ONLINE de loja
// quando o pagamento confirma. Baixa o estoque DA LOJA e paga a comissão pela ÁRVORE OFICIAL (30%).
// Idempotência fica por conta do webhook (só chama 1x).
import { calcularComissao } from './arvoreOficial.js';
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

// 💰 Comissão pela ÁRVORE OFICIAL (30%) — api/_lib/arvoreOficial.js.
// TOPO (10%): governança + gestão recebem SEMPRE, pelo cargo (inclusive na venda orgânica).
// CADEIA (20%): operação + comercial só recebem se estiverem na cadeia da venda; sem dono, empresa.
// ⚠️ sem seller_id (venda orgânica) NÃO retorna zero: o topo tem que receber.
async function payStoreCommissions(sale) {
  const value = Number(sale.total_amount) || 0;
  if (!value) return 0;

  // 🔒 Guarda de idempotência: se JÁ existe comissão pra esta venda, não paga de novo.
  // Protege contra qualquer caminho que chame isto 2x (webhook em corrida, retry, etc.).
  const jaTem = await (await sb(`commission_records?select=id&sale_id=eq.${encodeURIComponent(sale.id)}&limit=1`)).json();
  if (Array.isArray(jaTem) && jaTem.length) return 0;

  // active=neq.false → conta desativada (ex.: duplicata) NÃO entra nos pools
  const users = await (await sb('app_users?select=id,full_name,career_levels,referred_by_id&active=neq.false&limit=2000')).json();
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
  const porPessoa = {};
  for (const a of assignments) porPessoa[a.user_id] = round2((porPessoa[a.user_id] || 0) + a.amount);
  for (const [uid, amount] of Object.entries(porPessoa)) {
    if (amount > 0.001) await sb('rpc/credit_commission', { method: 'POST', body: JSON.stringify({ _user: uid, _amount: amount }) });
  }
  return round2(total);
}

export async function fulfillStoreOrder(sale) {
  const now = new Date().toISOString();
  // baixa o estoque da loja item a item (qty=0 → inativo)
  let items = sale.items_json;
  if (typeof items === 'string') { try { items = JSON.parse(items); } catch { items = []; } }
  items = Array.isArray(items) ? items : [];
  let baixados = 0;
  for (const it of items) {
    const pid = String(it.product_id || '');
    const qty = Math.max(1, Number(it.qty) || 1);
    if (!pid) continue;
    const siArr = await (await sb(`store_inventory?select=id,quantity&owner_id=eq.${encodeURIComponent(sale.seller_id)}&product_id=eq.${encodeURIComponent(pid)}&limit=1`)).json();
    const si = Array.isArray(siArr) ? siArr[0] : null;
    if (!si) continue;
    const newQty = Math.max(0, (Number(si.quantity) || 0) - qty);
    await sb(`store_inventory?id=eq.${encodeURIComponent(si.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ quantity: newQty, active: newQty > 0, updated_at: now }) });
    baixados++;
  }
  const commission = await payStoreCommissions(sale);
  await sb(`catalog_sales?id=eq.${sale.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_total: commission, fulfillment_status: 'a_enviar' }) });
  return { loja: true, baixados, commission };
}
