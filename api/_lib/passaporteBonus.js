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
 * Recolhe o bônus de quem ARREMATOU — PROPORCIONAL À FATIA ARREMATADA.
 *
 * 🔴 BUG CORRIGIDO EM 18/08/2026 (autorizado pelo dono).
 * A versão anterior varria TODOS os cupons 'creditado' do usuário e recolhia o
 * valor INTEIRO de cada um a qualquer arremate. Risco medido na auditoria: uma
 * conta com bônus de R$ 45,00 (aporte de R$ 450,00) perderia os R$ 45 completos
 * ao arrematar um item de R$ 20,00.
 *
 * REGRA OFICIAL (fatiada): só a FATIA arrematada perde o bônus dela.
 *   recolhimento = 10% do valor arrematado, limitado ao bônus ainda ativo.
 *
 * Segurança preservada:
 * • Nunca deixa saldo negativo (ajustarSaldo já limita ao saldo existente).
 * • Consome os cupons em ordem de criação (FIFO), de forma PARCIAL: o cupom só
 *   vira 'recolhido' quando é consumido por inteiro; se sobrou bônus, ele
 *   continua 'creditado' com o parcial somado em bonus_recolhido_valor.
 * • Quanto ainda resta de cada cupom = valor_credito - bonus_recolhido_valor
 *   (usa colunas que já existem — nenhuma migração nova é necessária).
 * • Se o valor do arremate não for informado, é buscado pelo próprio auctionId,
 *   que os chamadores atuais já passam. Assim a assinatura antiga continua
 *   funcionando sem virar "recolhe zero" silencioso.
 */
export async function recolherBonusPorArremate(userId, auctionId = null, valorArrematado = null) {
  try {
    if (!ok()) return { recolhido: 0, reason: 'config' };
    const uid = String(userId || '').trim();
    if (!uid) return { recolhido: 0, reason: 'sem_usuario' };

    // 1) Valor da fatia arrematada — informado, ou lido do próprio leilão
    let base = money(valorArrematado);
    if (base <= 0 && auctionId) {
      const a = await (await sb(`auctions?select=current_price&id=eq.${enc(String(auctionId))}&limit=1`)).json();
      base = money(Array.isArray(a) && a[0] ? a[0].current_price : 0);
    }
    if (base <= 0) return { recolhido: 0, reason: 'valor_arremate_indeterminado' };

    // 2) Alvo do recolhimento: 10% SÓ da fatia arrematada
    const alvo = money((base * PCT_BONUS) / 100);
    if (alvo <= 0) return { recolhido: 0, reason: 'alvo_zero' };

    const rows = await (await sb(
      `passaporte_coupons?select=id,valor_credito,bonus_recolhido_valor&user_id=eq.${enc(uid)}&status=eq.creditado&order=created_at.asc`
    )).json();
    const lista = Array.isArray(rows) ? rows : [];
    if (!lista.length) return { recolhido: 0, reason: 'sem_bonus_ativo' };

    let restaRecolher = alvo;
    let total = 0;

    for (const c of lista) {
      if (restaRecolher <= 0) break;

      const jaRecolhido = money(c.bonus_recolhido_valor);
      const disponivelNoCupom = money(money(c.valor_credito) - jaRecolhido);
      if (disponivelNoCupom <= 0) continue;

      const tirarDoCupom = money(Math.min(disponivelNoCupom, restaRecolher));
      const consomeTudo = tirarDoCupom >= disponivelNoCupom;

      // CAS por bonus_recolhido_valor: se dois arremates rodarem juntos, só um
      // consegue avançar este cupom — o outro relê na próxima volta do laço.
      const casFilter = jaRecolhido === 0
        ? `or=(bonus_recolhido_valor.eq.0,bonus_recolhido_valor.is.null)`
        : `bonus_recolhido_valor=eq.${jaRecolhido}`;

      const claim = await sb(`passaporte_coupons?id=eq.${enc(c.id)}&${casFilter}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          bonus_recolhido_valor: money(jaRecolhido + tirarDoCupom),
          // só encerra o cupom quando o bônus dele acabou por completo
          ...(consomeTudo
            ? { status: 'recolhido', bonus_recolhido_em: new Date().toISOString() }
            : {}),
          ...(auctionId ? { auction_id_arrematado: String(auctionId) } : {}),
        }),
      });
      const claimed = await claim.json().catch(() => []);
      if (!Array.isArray(claimed) || !claimed.length) continue; // corrida: segue

      // 3) Só depois de garantir a marca, o dinheiro sai da carteira
      const res = await ajustarSaldo(uid, -tirarDoCupom);
      const recolhido = money(Math.abs(res.applied));
      total = money(total + recolhido);
      restaRecolher = money(restaRecolher - tirarDoCupom);
    }

    return { recolhido: total, alvo, valor_arrematado: base, pct: PCT_BONUS };
  } catch (e) {
    return { recolhido: 0, reason: String(e?.message || e) };
  }
}