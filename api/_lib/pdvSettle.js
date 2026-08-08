// pdvSettle — helper (pasta _lib, não é rota): conclui uma venda PIX do PDV quando o
// Mercado Pago confirma o pagamento. SÓ AGORA o estoque baixa e a comissão é paga —
// enquanto o pedido está 'pending_payment' ele não vale nada (sem faturamento, sem comissão).
// Chamado 1x pelo mpWebhook (o flip atômico lá garante execução única).
import { fulfillStoreOrder } from './storeFulfill.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export async function settlePdvPixSale(sale) {
  const now = new Date().toISOString();
  let raw = sale.raw_base44;
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = {}; } }
  raw = raw || {};
  const items = Array.isArray(raw.items) ? raw.items : [];
  const isStoreOwner = raw.is_store_owner === true;
  const ownerId = raw.operator_id || sale.seller_id;

  // baixa o estoque item a item — MESMA regra do fluxo Dinheiro/Cartão do PDV:
  // dono de loja baixa do PRÓPRIO store_inventory; distribuidor baixa de products.
  for (const it of items) {
    const pid = String(it.product_id || '');
    if (!pid) continue;
    const qty = Math.max(1, Number(it.qty) || 1);
    if (isStoreOwner) {
      const siArr = await (await sb(`store_inventory?select=id,quantity&owner_id=eq.${encodeURIComponent(ownerId)}&product_id=eq.${encodeURIComponent(pid)}&limit=1`)).json();
      const si = Array.isArray(siArr) ? siArr[0] : null;
      if (si) {
        const newQty = Math.max(0, (Number(si.quantity) || 0) - qty);
        await sb(`store_inventory?id=eq.${encodeURIComponent(si.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ quantity: newQty, active: newQty > 0, updated_at: now }) });
      }
    } else {
      const pArr = await (await sb(`products?select=id,quantity,quantity_sold,sold_amount&id=eq.${encodeURIComponent(pid)}&limit=1`)).json();
      const p = Array.isArray(pArr) ? pArr[0] : null;
      if (p) {
        const newQty = Math.max(0, (Number(p.quantity) || 0) - qty);
        await sb(`products?id=eq.${encodeURIComponent(pid)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
          quantity: newQty,
          quantity_sold: (Number(p.quantity_sold) || 0) + qty,
          sold_amount: round2((Number(p.sold_amount) || 0) + (Number(it.unit) || 0) * qty),
          status: newQty > 0 ? 'ESTOQUE' : 'VENDIDO',
          updated_date: now,
        }) });
      }
    }
  }

  // 💰 comissão pela ÁRVORE OFICIAL (mesmo motor da loja) — estoque já baixado acima
  let commission = 0;
  try {
    const rr = await fulfillStoreOrder({ ...sale, skipStock: true });
    commission = rr?.commission ?? 0;
  } catch (e) {
    console.warn('PDV PIX: comissão falhou (venda segue paga):', e?.message);
  }

  // retirada no balcão → entregue na hora (o flip do webhook já marcou 'paid')
  if (raw.delivered === true) {
    await sb(`catalog_sales?id=eq.${encodeURIComponent(sale.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'entregue', delivered_at: now }) });
  }

  return { pdv: true, commission };
}