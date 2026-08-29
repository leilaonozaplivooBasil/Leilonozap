// financialIncome — helper (pasta _lib, não é rota): grava uma linha no livro-razão de
// receita (financial_income, DIR-7) no MOMENTO em que ela é confirmada.
//
// Regra de reconhecimento decidida com o dono (ver docs/DIRETIVA_ATUAL.md, DIR-7): só
// comissão de venda já liquidada e taxa sem repasse a terceiro contam como receita —
// NUNCA o valor cheio de uma venda de Loja/Leilão (o resto vai pro vendedor) nem
// depósito de saldo/carteira/operação (é só crédito interno; contar o depósito E a
// comissão de quando ele for gasto seria contar o mesmo dinheiro duas vezes).
//
// Best-effort de propósito: quando isto é chamado, o dinheiro do cliente já está
// confirmado e pago de verdade (a venda já virou 'paid', o saldo já foi creditado). Um
// erro aqui não pode desfazer nem travar o que já aconteceu — só fica faltando uma
// linha no relatório, registrada no log pra alguém completar na mão se precisar.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export async function registrarReceita({ description, category, costCenter, amount, source, saleId, notes }) {
  const valor = round2(amount);
  if (valor <= 0) return; // comissão zerada (ex.: teto de comissão atingido) não é receita
  try {
    const r = await sb('financial_income', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        description, category, cost_center: costCenter, amount: valor, source,
        sale_id: saleId || null, notes: notes || null,
      }),
    });
    if (!r.ok) {
      console.warn(`[financialIncome] HTTP ${r.status} ao registrar receita (venda ${saleId || '-'}, categoria ${category}):`, (await r.text().catch(() => '')).slice(0, 300));
    }
  } catch (e) {
    console.warn(`[financialIncome] falha ao registrar receita (venda ${saleId || '-'}, categoria ${category}):`, e?.message);
  }
}
