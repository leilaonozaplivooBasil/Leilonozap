// passaporteCoupon — motor do Cupom Passaporte (crédito de 10% do valor aportado).
//
// Nasce BLOQUEADO no confirm do depósito, é LIBERADO só quando o usuário disputou
// um leilão e foi superado, e é CANCELADO se ele arrematou (o aporte virou compra).
// Sem teto e sem validade: o que não é usado fica guardado em saldo_restante.
//
// Tudo aqui roda com service role e NUNCA lança erro pra fora: é um efeito
// secundário — falha aqui não pode derrubar pagamento, lance nem arremate.
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const PCT_PASSAPORTE = 10;
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

/** Cria o cupom BLOQUEADO de um depósito confirmado. Idempotente por origin_sale_id. */
export async function criarCupomPassaporte(sale) {
  try {
    if (!ok()) return { created: false, reason: 'config' };
    const userId = String(sale?.buyer_id || '').trim();
    const aporte = money(sale?.total_amount || sale?.sale_price);
    if (!userId || aporte < DEPOSITO_MINIMO) return { created: false, reason: 'abaixo_do_minimo' };

    const credito = money(aporte * PCT_PASSAPORTE / 100);
    const r = await sb('passaporte_coupons', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: userId,
        origin_sale_id: String(sale.id),
        valor_aportado: aporte,
        pct: PCT_PASSAPORTE,
        valor_credito: credito,
        saldo_restante: credito,
        status: 'bloqueado',
      }),
    });
    if (!r.ok) return { created: false, reason: 'duplicado_ou_erro' }; // UNIQUE = já existe
    return { created: true, valor_credito: credito };
  } catch (e) {
    return { created: false, reason: String(e?.message || e) };
  }
}

/**
 * Libera os cupons bloqueados do usuário: ele deu lance e foi superado.
 * Chamado na devolução da reserva de lance (quem foi coberto).
 */
export async function liberarCupomPassaporte(userId, auctionId = null) {
  try {
    if (!ok()) return { released: 0 };
    const uid = String(userId || '').trim();
    if (!uid) return { released: 0 };
    const r = await sb(`passaporte_coupons?user_id=eq.${enc(uid)}&status=eq.bloqueado`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        status: 'liberado',
        liberado_em: new Date().toISOString(),
        ...(auctionId ? { auction_id_disputado: String(auctionId) } : {}),
      }),
    });
    const rows = await r.json().catch(() => []);
    return { released: Array.isArray(rows) ? rows.length : 0 };
  } catch (e) {
    return { released: 0, reason: String(e?.message || e) };
  }
}

/** Cancela os cupons AINDA bloqueados de quem arrematou (o aporte virou compra). */
export async function cancelarCuponsBloqueados(userId) {
  try {
    if (!ok()) return { canceled: 0 };
    const uid = String(userId || '').trim();
    if (!uid) return { canceled: 0 };
    const r = await sb(`passaporte_coupons?user_id=eq.${enc(uid)}&status=eq.bloqueado`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'cancelado' }),
    });
    const rows = await r.json().catch(() => []);
    return { canceled: Array.isArray(rows) ? rows.length : 0 };
  } catch (e) {
    return { canceled: 0, reason: String(e?.message || e) };
  }
}

/** Situação dos cupons do usuário (para o carrinho). */
export async function statusCupons(userId) {
  if (!ok()) return { liberado: null, tem_bloqueado: false };
  const uid = String(userId || '').trim();
  if (!uid) return { liberado: null, tem_bloqueado: false };
  const rows = await (await sb(
    `passaporte_coupons?select=id,valor_credito,saldo_restante,status,valor_aportado` +
    `&user_id=eq.${enc(uid)}&status=in.(liberado,bloqueado)&order=created_at.asc`
  )).json();
  const lista = Array.isArray(rows) ? rows : [];
  const liberado = lista.find((c) => c.status === 'liberado' && money(c.saldo_restante) > 0) || null;
  return {
    liberado: liberado
      ? { id: liberado.id, saldo: money(liberado.saldo_restante), credito: money(liberado.valor_credito), aporte: money(liberado.valor_aportado) }
      : null,
    tem_bloqueado: lista.some((c) => c.status === 'bloqueado'),
  };
}

/**
 * Quanto o cupom liberado do usuário abate de um total.
 * Sem teto: abate até o total inteiro, limitado apenas pelo saldo do cupom.
 */
export async function calcularDesconto(userId, total) {
  try {
    const { liberado } = await statusCupons(userId);
    if (!liberado) return null;
    const desconto = money(Math.min(liberado.saldo, money(total)));
    if (desconto <= 0) return null;
    return { coupon_id: liberado.id, desconto, saldo_antes: liberado.saldo };
  } catch (_) {
    return null; // sem cupom → cobra cheio (nunca bloqueia a venda)
  }
}

/**
 * Debita o crédito usado — só no CONFIRM do pagamento. CAS em saldo_restante
 * (nunca debita duas vezes o mesmo valor se o webhook repetir).
 */
export async function debitarCupom(couponId, amount, saleId) {
  try {
    if (!ok()) return { debited: 0 };
    const id = String(couponId || '').trim();
    const valor = money(amount);
    if (!id || valor <= 0) return { debited: 0 };

    for (let i = 0; i < 4; i++) {
      const rows = await (await sb(`passaporte_coupons?select=saldo_restante,status,primeiro_uso_em&id=eq.${enc(id)}&limit=1`)).json();
      const c = Array.isArray(rows) ? rows[0] : null;
      if (!c) return { debited: 0, reason: 'nao_encontrado' };
      const saldo = money(c.saldo_restante);
      const debitar = money(Math.min(valor, saldo));
      if (debitar <= 0) return { debited: 0, reason: 'sem_saldo' };
      const novo = money(saldo - debitar);

      const patch = await sb(`passaporte_coupons?id=eq.${enc(id)}&saldo_restante=eq.${saldo}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          saldo_restante: novo,
          status: novo <= 0 ? 'usado' : 'liberado',
          primeiro_uso_em: c.primeiro_uso_em || new Date().toISOString(),
        }),
      });
      const updated = await patch.json().catch(() => []);
      if (Array.isArray(updated) && updated.length) {
        return { debited: debitar, saldo_restante: novo, sale_id: saleId || null };
      }
      // corrida: outro uso mexeu no saldo — tenta de novo
    }
    return { debited: 0, reason: 'corrida' };
  } catch (e) {
    return { debited: 0, reason: String(e?.message || e) };
  }
}

/** Debita o cupom vinculado a uma venda paga (lido de raw_base44). Idempotente por venda. */
export async function debitarCupomDaVenda(sale) {
  try {
    const raw = sale?.raw_base44 || {};
    const couponId = raw.passaporte_coupon_id;
    const amount = money(raw.passaporte_desconto);
    if (!couponId || amount <= 0) return { debited: 0, skipped: true };
    return await debitarCupom(couponId, amount, sale.id);
  } catch (e) {
    return { debited: 0, reason: String(e?.message || e) };
  }
}