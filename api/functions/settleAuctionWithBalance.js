// settleAuctionWithBalance — liquida o arremate AUTOMATICAMENTE com o saldo da carteira.
// Chamado quando o modal de vitória abre: debita o lance vencedor do saldo_disponivel,
// cria a venda já paga (kind 'arremate') e paga comissões — sem passar pelo checkout.
// Idempotente: flip atômico do order_status da auction garante execução única.
import { oid } from '../_lib/oid.js';
import { fulfillStoreOrder } from '../_lib/storeFulfill.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}
// dinheiro sempre em centavos inteiros — zero erro de float
const cents = (n) => Math.round((Number(n) || 0) * 100);
const fromCents = (c) => c / 100;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const auctionId = String(body?.auction_id || '').trim();
    const userId = String(body?.user_id || '').trim();
    if (!auctionId || !userId) return res.status(400).json({ success: false, error: 'Dados obrigatórios ausentes' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const aRows = await (await sb(`auctions?select=id,title,current_price,winner_id,winner_name,status,order_status,image_urls&id=eq.${encodeURIComponent(auctionId)}&limit=1`)).json();
    const auction = Array.isArray(aRows) ? aRows[0] : null;
    if (!auction) return res.status(200).json({ success: false, error: 'Leilão não encontrado' });
    if (auction.winner_id !== userId) return res.status(200).json({ success: false, error: 'Usuário não é o vencedor' });
    if (auction.order_status === 'paid') return res.status(200).json({ success: true, already_paid: true });

    const amountCents = cents(auction.current_price);
    if (amountCents <= 0) return res.status(200).json({ success: false, error: 'Valor inválido' });
    const amount = fromCents(amountCents);

    const uRows = await (await sb(`app_users?select=saldo_disponivel,full_name,email,cpf&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
    const user = Array.isArray(uRows) ? uRows[0] : null;
    if (!user) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });
    if (cents(user.saldo_disponivel) < amountCents) {
      return res.status(200).json({
        success: false, insufficient: true,
        error: 'Saldo insuficiente',
        balance: fromCents(cents(user.saldo_disponivel)),
        needed: amount,
      });
    }

    // 🔒 flip atômico: só quem pegar a auction AINDA em awaiting_payment liquida.
    const flip = await sb(`auctions?id=eq.${encodeURIComponent(auctionId)}&order_status=eq.awaiting_payment`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ order_status: 'paid' }),
    });
    const flipped = await flip.json().catch(() => []);
    if (!Array.isArray(flipped) || !flipped.length) {
      return res.status(200).json({ success: true, already_paid: true, raced: true });
    }

    // débito atômico (CAS) em centavos
    let newBalance = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const rows = await (await sb(`app_users?select=saldo_disponivel&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
      const cur = cents(Array.isArray(rows) ? rows[0]?.saldo_disponivel : 0);
      if (cur < amountCents) {
        // saldo caiu no meio do caminho — desfaz o flip e devolve o CTA de pagamento
        await sb(`auctions?id=eq.${encodeURIComponent(auctionId)}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ order_status: 'awaiting_payment' }),
        });
        return res.status(200).json({ success: false, insufficient: true, error: 'Saldo insuficiente', balance: fromCents(cur), needed: amount });
      }
      const novo = fromCents(cur - amountCents);
      const patch = await sb(
        `app_users?id=eq.${encodeURIComponent(userId)}&saldo_disponivel=eq.${fromCents(cur)}`,
        { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ saldo_disponivel: novo }) }
      );
      const updated = await patch.json().catch(() => []);
      if (Array.isArray(updated) && updated.length) { newBalance = novo; break; }
    }
    if (newBalance === null) {
      await sb(`auctions?id=eq.${encodeURIComponent(auctionId)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ order_status: 'awaiting_payment' }),
      });
      return res.status(200).json({ success: false, error: 'Concorrência ao debitar, tente novamente' });
    }

    // venda já paga (mesma rota do arremate via PIX, sem gateway)
    const saleId = oid();
    const sale = {
      id: saleId, base44_id: saleId, kind: 'arremate',
      buyer_id: userId, buyer_email: user.email || '', buyer_name: user.full_name || auction.winner_name || 'Vencedor',
      product_title: `Arremate — ${auction.title}`.slice(0, 200),
      sale_price: amount, total_amount: amount, quantity: 1,
      status: 'paid', payment_method: 'saldo',
      tracking_code: 'AR' + saleId.slice(0, 8).toUpperCase(),
      created_date: new Date().toISOString(),
    };
    await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(sale) });

    // comissões — mesma regra do webhook para arremate
    let commission = 0;
    try {
      const rr = await fulfillStoreOrder(sale);
      commission = rr?.commission ?? 0;
      await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_total: commission }) });
    } catch (e) {
      console.warn('settle: comissão falhou (venda segue paga):', e?.message);
    }

    return res.status(200).json({ success: true, paid: true, sale_id: saleId, amount, new_balance: newBalance, commission });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
