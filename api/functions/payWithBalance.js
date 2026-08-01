// payWithBalance — compra paga com o saldo de comissão (commission_balance) do próprio usuário.
// Para vendedores/lojistas redimirem comissão em produtos da plataforma.
// Toda a validação (preço, estoque, saldo) e a baixa acontecem ATÔMICAS na função SQL comprar_com_saldo.
import { fulfillStoreOrder } from '../_lib/storeFulfill.js';
import { resolverFreteDoCheckout } from '../_lib/frete.js';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Ajuste ATÔMICO do saldo de comissão (CAS: só grava se o saldo não mudou no meio).
// Usado pra reservar/devolver o frete sem risco de perder depósito concorrente.
async function ajustarSaldoCAS(userId, delta) {
  for (let i = 0; i < 6; i++) {
    const rows = await (await sb(`app_users?select=commission_balance&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
    const u = Array.isArray(rows) ? rows[0] : null;
    if (!u) return { ok: false, error: 'usuario_nao_encontrado' };
    const atual = round2(u.commission_balance);
    const novo = round2(atual + delta);
    if (novo < 0) return { ok: false, error: 'saldo_insuficiente', saldo: atual };
    const patch = await sb(`app_users?id=eq.${encodeURIComponent(userId)}&commission_balance=eq.${atual}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ commission_balance: novo }),
    });
    const upd = await patch.json().catch(() => []);
    if (Array.isArray(upd) && upd.length) return { ok: true, saldo: novo };
  }
  return { ok: false, error: 'conflito_de_saldo' };
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
function rpc(fn, args) {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const buyerId = String(body?.buyer_id || '').trim();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!buyerId) return res.status(400).json({ success: false, error: 'Usuário obrigatório' });
    if (!items.length) return res.status(400).json({ success: false, error: 'Carrinho vazio' });

    // normaliza itens -> [{product_id, qty}]
    const cleanItems = items
      .map((it) => ({ product_id: String(it.product_id || it.id || '').trim(), qty: Math.max(1, parseInt(it.quantity || it.qty || 1, 10) || 1) }))
      .filter((it) => it.product_id);
    if (!cleanItems.length) return res.status(400).json({ success: false, error: 'Itens inválidos' });

    // resolve o seller (loja) pra atribuição/envio: prioridade ref_code do link, senão o RPC decide
    let sellerId = body?.seller_id ? String(body.seller_id) : null;
    const refCode = String(body?.ref_code || '').trim();
    if (!sellerId && refCode) {
      const r = await (await sb(`app_users?select=id&referral_code=eq.${encodeURIComponent(refCode)}&limit=1`)).json();
      if (Array.isArray(r) && r[0]) sellerId = r[0].id;
    }

    // 🚚 PONTO 74 — frete RECOTADO no servidor. Reservamos o frete ANTES do RPC (CAS) e
    // devolvemos se a compra falhar: assim o saldo nunca fica pago pela metade.
    const fr = await resolverFreteDoCheckout({
      delivery_type: body?.delivery_type || (body?.buyer_address === 'Retirada' ? 'pickup' : 'delivery'),
      cep: body?.buyer_cep,
      items: cleanItems,
      frete_id: body?.frete_id,
    });
    if (!fr.ok) return res.status(200).json({ success: false, error: fr.error });
    const frete = fr.frete;
    if (frete.valor > 0) {
      const rv = await ajustarSaldoCAS(buyerId, -frete.valor);
      if (!rv.ok) {
        return res.status(200).json({
          success: false,
          error: rv.error === 'saldo_insuficiente' ? 'Saldo insuficiente para cobrir o frete.' : 'Não foi possível reservar o frete agora.',
          saldo: rv.saldo,
        });
      }
    }

    const r = await rpc('comprar_com_saldo', {
      _buyer: buyerId,
      _items: cleanItems,
      _seller: sellerId,
      _buyer_name: body?.buyer_name || null,
      _buyer_phone: body?.buyer_phone ? String(body.buyer_phone).replace(/\D/g, '') : null,
      _address: body?.buyer_address || null,
      _cep: body?.buyer_cep ? String(body.buyer_cep).replace(/\D/g, '') : null,
      _coupon: body?.coupon_code ? String(body.coupon_code) : null,
    });
    const out = await r.json();
    const data = Array.isArray(out) ? out[0] : out; // rpc retorna o json direto

    if (!data || data.ok !== true) {
      // compra não passou → devolve o frete que havia sido reservado
      if (frete.valor > 0) await ajustarSaldoCAS(buyerId, frete.valor);
      return res.status(200).json({ success: false, error: data?.error || 'Não foi possível concluir', saldo: data?.saldo, total: data?.total });
    }

    // registra o frete cobrado na venda (fora de total_amount, que é a base da comissão)
    if (frete.valor > 0) {
      try {
        const cur = await (await sb(`catalog_sales?select=raw_base44,total_amount&id=eq.${encodeURIComponent(data.sale_id)}&limit=1`)).json();
        const base = (Array.isArray(cur) && cur[0]?.raw_base44) || {};
        await sb(`catalog_sales?id=eq.${encodeURIComponent(data.sale_id)}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ raw_base44: { ...base, frete, amount_charged: round2(Number(cur?.[0]?.total_amount || data.total) + frete.valor) } }),
        });
      } catch (_) { /* frete já debitado; registro é secundário */ }
    }

    // conclui como venda de loja: comissão pro DONO da loja (modelo marketplace) + fulfillment.
    // Mesma rota de uma venda PIX paga (kind='loja' → fulfillStoreOrder no webhook).
    let commission = 0;
    try {
      const saleArr = await (await sb(`catalog_sales?select=*&id=eq.${encodeURIComponent(data.sale_id)}&limit=1`)).json();
      const sale = Array.isArray(saleArr) ? saleArr[0] : null;
      if (sale && !Number(sale.commission_total)) {
        const r = await fulfillStoreOrder(sale);
        commission = r?.commission || 0;
      }
    } catch (e) { console.error('fulfillStoreOrder (saldo) falhou:', e?.message || e); }

    // novo_saldo já vem descontado do frete (a reserva aconteceu ANTES do RPC)
    return res.status(200).json({ success: true, sale_id: data.sale_id, total: data.total, shipping: frete.valor, total_cobrado: round2(Number(data.total || 0) + frete.valor), novo_saldo: data.novo_saldo, tracking: data.tracking, commission });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}