// passaporteBonus — modelo A do Passaporte de Lances (PONTO 68).
//
// REGRA: depósito de R$ 100 ou mais credita +10% NA HORA no saldo disponível
// (R$ 100 pagos = R$ 110 de crédito). Se o usuário ARREMATAR, o bônus é
// recolhido do saldo — o valor pago virou compra, e o bônus era para quem
// participa e não leva.
//
// Segurança:
// • CAS em saldo_disponivel: nunca apaga um depósito concorrente.
// • Recolhimento NUNCA deixa saldo negativo: recolhe no máximo o que existe.
// • Idempotente: um registro por depósito (UNIQUE em origin_sale_id) e o
//   recolhimento só acontece em registro ainda 'creditado'.
// • Nunca lança erro pra fora: é efeito secundário de pagamento/arremate.
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const PCT_BONUS = 10;
export const DEPOSITO_MINIMO = 100;

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const enc = encodeURIComponent;
const ok = () => Boolean(SUPABASE_URL && SR);

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

/** Soma `delta` em saldo_disponivel com CAS. delta negativo nunca passa de zero. */
async function ajustarSaldo(userId, delta) {
  for (let i = 0; i < 6; i++) {
    const rows = await (await sb(`app_users?select=saldo_disponivel&id=eq.${enc(userId)}&limit=1`)).json();
    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user) return { applied: 0, reason: 'usuario_nao_encontrado' };
    const atual = money(user.saldo_disponivel);
    const aplicar = delta < 0 ? -money(Math.min(Math.abs(delta), atual)) : money(delta);
    if (aplicar === 0) return { applied: 0, reason: 'sem_saldo', saldo: atual };
    const novo = money(atual + aplicar);
    const patch = await sb(`app_users?id=eq.${enc(userId)}&saldo_disponivel=eq.${atual}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ saldo_disponivel: novo }),
    });
    const updated = await patch.json().catch(() => []);
    if (Array.isArray(updated) && updated.length) return { applied: aplicar, saldo: novo };
    // corrida (depósito/lance simultâneo) — relê e tenta de novo
  }
  return { applied: 0, reason: 'corrida' };
}

/**
 * Credita o bônus de 10% na carteira, na hora, e registra para auditoria.
 * Chamado no confirm do depósito, DEPOIS do crédito do valor principal.
 */
export async function creditarBonusPassaporte(sale) {
  try {
    if (!ok()) return { bonus: 0, reason: 'config' };
    const userId = String(sale?.buyer_id || '').trim();
    const aporte = money(sale?.total_amount || sale?.sale_price);
    if (!userId || aporte < DEPOSITO_MINIMO) return { bonus: 0, reason: 'abaixo_do_minimo' };

    const bonus = money((aporte * PCT_BONUS) / 100);

    // 1) Registro primeiro: o UNIQUE em origin_sale_id garante que um webhook
    //    repetido NÃO credite o bônus duas vezes.
    const r = await sb('passaporte_coupons', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: userId,
        origin_sale_id: String(sale.id),
        valor_aportado: aporte,
        pct: PCT_BONUS,
        valor_credito: bonus,
        saldo_restante: 0, // no modelo A o crédito vive na carteira, não no cupom
        status: 'creditado',
        bonus_creditado_em: new Date().toISOString(),
      }),
    });
    if (!r.ok) return { bonus: 0, reason: 'duplicado_ou_erro' };

    // 2) Só então o dinheiro entra na carteira
    const res = await ajustarSaldo(userId, bonus);
    return { bonus: res.applied, saldo: res.saldo ?? null, pct: PCT_BONUS };
  } catch (e) {
    return { bonus: 0, reason: String(e?.message || e) };
  }
}

/**
 * Recolhe o bônus de quem ARREMATOU (o valor pago virou compra).
 * Recolhe no máximo o saldo existente — jamais gera saldo negativo.
 */
export async function recolherBonusPorArremate(userId, auctionId = null) {
  try {
    if (!ok()) return { recolhido: 0 };
    const uid = String(userId || '').trim();
    if (!uid) return { recolhido: 0 };

    const rows = await (await sb(
      `passaporte_coupons?select=id,valor_credito&user_id=eq.${enc(uid)}&status=eq.creditado&order=created_at.asc`
    )).json();
    const lista = Array.isArray(rows) ? rows : [];
    if (!lista.length) return { recolhido: 0, reason: 'sem_bonus_ativo' };

    let total = 0;
    for (const c of lista) {
      // marca ANTES (CAS por status) — se dois arremates rodarem juntos, só um recolhe
      const claim = await sb(`passaporte_coupons?id=eq.${enc(c.id)}&status=eq.creditado`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'recolhido',
          bonus_recolhido_em: new Date().toISOString(),
          ...(auctionId ? { auction_id_arrematado: String(auctionId) } : {}),
        }),
      });
      const claimed = await claim.json().catch(() => []);
      if (!Array.isArray(claimed) || !claimed.length) continue;

      const res = await ajustarSaldo(uid, -money(c.valor_credito));
      const recolhido = money(Math.abs(res.applied));
      total = money(total + recolhido);
      await sb(`passaporte_coupons?id=eq.${enc(c.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ bonus_recolhido_valor: recolhido }),
      });
    }
    return { recolhido: total };
  } catch (e) {
    return { recolhido: 0, reason: String(e?.message || e) };
  }
}