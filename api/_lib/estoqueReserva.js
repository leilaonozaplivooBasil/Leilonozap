// estoqueReserva — trava a peça entre "comprar" e "pagou" (Fase 2 do plano de estoque,
// 21/08/2026, PONTO 126). Sem isso, dois compradores passam na conferência da última
// peça e os dois geram PIX — o segundo vira reembolso manual, sem ninguém saber.
//
// reservar() confere disponível (quantity − reservas ativas) e insere, na MESMA operação
// atômica no banco (rpc/reservar_estoque) — a corrida é decidida no banco, nunca no JS.
// consumir() roda quando o pagamento confirma (dentro de storeFulfill.js / pdvSettle.js).
// devolver() roda quando o checkout desiste ou falha antes de virar cobrança de verdade.
// A expiração de quem nunca voltou pra pagar é o cron expirarReservasEstoque.js, 1x/min.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VALIDADE_PADRAO_MIN = 30;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

async function rpc(fn, payload) {
  const r = await sb(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(payload) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.success) return { ok: false, motivo: j?.error || `http_${r.status}`, disponivel: j?.disponivel };
  return { ok: true, ...j };
}

/** Reserva UM item. ownerId null = estoque central (products); preenchido = estoque
 * próprio do lojista (store_inventory). */
export async function reservarItem({ productId, ownerId = null, saleId, qty, minutosValidade = VALIDADE_PADRAO_MIN }) {
  return rpc('reservar_estoque', {
    _product_id: String(productId),
    _owner_id: ownerId ? String(ownerId) : null,
    _sale_id: String(saleId),
    _qty: Number(qty) || 0,
    _minutos_validade: minutosValidade,
  });
}

/**
 * Reserva todos os itens de uma venda. TUDO OU NADA: no primeiro item que não couber,
 * desfaz o que essa mesma venda já tinha reservado — nenhum checkout fica com reserva
 * parcial (metade do carrinho travado, metade não).
 * @param items [{ product_id, qty|quantity, title }]
 * @returns {{ ok: boolean, motivo?: string, produto?: string, titulo?: string }}
 */
export async function reservarItensDaVenda({ ownerId = null, saleId, items, minutosValidade }) {
  const reservados = [];
  for (const it of items || []) {
    const productId = String(it.product_id || '');
    const qty = Math.max(1, Number(it.qty) || Number(it.quantity) || 1);
    if (!productId) continue;
    const r = await reservarItem({ productId, ownerId, saleId, qty, minutosValidade });
    if (!r.ok) {
      for (const done of reservados) await devolverItem({ saleId, productId: done.productId });
      return { ok: false, motivo: r.motivo, produto: productId, titulo: it.title || null };
    }
    reservados.push({ productId });
  }
  return { ok: true };
}

/** Libera a reserva de uma venda (best-effort — falha aqui nunca deve travar o checkout
 * que já está desistindo mesmo; a reserva expira sozinha pelo cron se isso não rodar). */
export async function devolverItem({ saleId, productId = null }) {
  try {
    return await rpc('devolver_reserva', { _sale_id: String(saleId), _product_id: productId });
  } catch (_) {
    return { ok: false, motivo: 'falhou_ao_devolver' };
  }
}

/** Marca a reserva da venda como consumida — o pagamento confirmou, a baixa de verdade
 * (Fase 1, baixar_estoque_central) é quem desconta; isto só solta o "hold". */
export async function consumirItensDaVenda({ saleId }) {
  return rpc('consumir_reserva', { _sale_id: String(saleId), _product_id: null });
}
