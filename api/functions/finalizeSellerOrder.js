// finalizeSellerOrder — fecha o pedido da Etapa 2 do "Seja Vendedor" (escolha de produtos
// usando o saldo da adesão já paga). Escrita direta do navegador em catalog_sales/app_users
// é bloqueada por RLS (usuário custom, sem sessão Supabase real) — por isso passa por aqui
// com service role, no mesmo padrão de createSellerAdhesionPayment.js / payAdhesionWithTestBalance.js.
import { oid } from '../_lib/oid.js';
import { baixarItensDaVenda } from '../_lib/baixaEstoque.js';
import { reservarItensDaVenda, devolverItem, consumirItensDaVenda } from '../_lib/estoqueReserva.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const { user_id, items, delivery_method, carrier, address, role } = body || {};
    const cargo = role === 'licenciado' ? 'licenciado' : 'vendedor';
    if (!SUPABASE_URL || !SR) return res.status(200).json({ success: false, error: 'Banco não configurado' });
    if (!user_id) return res.status(200).json({ success: false, error: 'user_id é obrigatório' });
    if (!Array.isArray(items) || !items.length) return res.status(200).json({ success: false, error: 'Carrinho vazio' });

    const userRows = await (await sb(`app_users?select=id,full_name,email,phone,seller_credit_balance,career_levels,address_street,address_number,address_complement,address_neighborhood,address_city,address_state,address_zip_code&id=eq.${encodeURIComponent(user_id)}&limit=1`)).json();
    const user = Array.isArray(userRows) ? userRows[0] : null;
    if (!user) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });
    const balance = Number(user.seller_credit_balance || 0);
    if (!(balance > 0)) return res.status(200).json({ success: false, error: 'Você não tem saldo de adesão disponível' });

    // 🔒 Recalcula o total no servidor a partir do preço real do produto — não confia no total do cliente.
    const ids = items.map((it) => String(it.product_id)).filter(Boolean);
    const prods = await (await sb(`products?select=id,description,price_catalog,image_urls,quantity&id=in.(${ids.map(encodeURIComponent).join(',')})`)).json();
    const byId = Object.fromEntries((Array.isArray(prods) ? prods : []).map((p) => [p.id, p]));

    let total = 0;
    let totalQty = 0;
    let firstProduct = null;
    // 📦 Revalida o estoque REAL no servidor — o carrinho do navegador pode estar desatualizado.
    for (const it of items) {
      const p = byId[String(it.product_id)];
      const qty = Math.max(1, Number(it.qty) || 1);
      if (!p) continue;
      const stock = Math.max(0, Number(p.quantity) || 0);
      if (qty > stock) {
        return res.status(200).json({ success: false, error: `Estoque insuficiente para "${p.description}" (disponível: ${stock}).` });
      }
      total += qty * Number(p.price_catalog || 0);
      totalQty += qty;
      if (!firstProduct) firstProduct = p;
    }
    total = Math.round(total * 100) / 100;
    if (!firstProduct || total < balance) {
      return res.status(200).json({ success: false, error: 'O total escolhido precisa atingir seu saldo de adesão' });
    }

    // 🔒 Reserva ATÔMICA no banco, ANTES de criar venda ou gastar o saldo — mesma trava
    // da Fase 2 (api/_lib/estoqueReserva.js). Até aqui esta rota só tinha o check acima
    // (lê, compara, segue), sem trava nenhuma: dois "Seja Vendedor" concorrentes no
    // último item liam o mesmo `quantity`, os dois passavam no check, os dois baixavam
    // com PATCH direto — o mesmo furo #2 do diagnóstico de 20/08, só que num caminho de
    // venda que a auditoria original não tinha visto. Tudo ou nada: se um item do
    // carrinho não couber, devolve os que já tinham sido reservados — nenhum saldo de
    // adesão é gasto e nenhuma venda nasce com carrinho pela metade.
    const itensBaixa = items.map((it) => {
      const p = byId[String(it.product_id)];
      return p ? { product_id: p.id, qty: Math.max(1, Number(it.qty) || 1), title: p.description } : null;
    }).filter(Boolean);
    const reservaId = oid();
    const reserva = await reservarItensDaVenda({ ownerId: null, saleId: reservaId, items: itensBaixa });
    if (!reserva.ok) {
      return res.status(200).json({
        success: false,
        error: `Estoque insuficiente para "${reserva.titulo || reserva.produto}".`,
      });
    }

    const isDelivery = delivery_method === 'delivery';
    const addressFields = isDelivery ? {
      buyer_address: [user.address_street, user.address_number, user.address_complement, user.address_neighborhood, user.address_city, user.address_state].filter(Boolean).join(', '),
      buyer_cep: user.address_zip_code,
    } : {};

    // 🧾 Uma linha em catalog_sales POR PRODUTO do carrinho (antes só o primeiro item gerava
    // registro — os demais baixavam do estoque sem deixar rastro. Bug corrigido em 03/08/2026).
    let saleIds = [];
    let careerLevels = [];
    try {
      for (const it of items) {
        const p = byId[String(it.product_id)];
        if (!p) continue;
        const qty = Math.max(1, Number(it.qty) || 1);
        const itemSaleId = oid();
        saleIds.push(itemSaleId);
        await sb('catalog_sales', {
          method: 'POST', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            id: itemSaleId, base44_id: itemSaleId, kind: 'seller_credit_purchase',
            product_id: p.id, product_title: p.description,
            product_image: p.image_urls?.[0] || null,
            sale_price: p.price_catalog || 0, quantity: qty, total_amount: Math.round(qty * Number(p.price_catalog || 0) * 100) / 100,
            buyer_id: user.id, buyer_name: user.full_name, buyer_email: user.email, buyer_phone: user.phone,
            licensee_id: 'site_official', licensee_name: 'Sistema — Adesão Vendedor',
            status: 'paid', payment_confirmed_date: new Date().toISOString(),
            carrier: isDelivery ? (carrier || 'A combinar') : 'Retirada na loja',
            ...addressFields,
            created_date: new Date().toISOString(),
          }),
        });
      }

      careerLevels = Array.from(new Set([...(user.career_levels || []), cargo]));
      await sb(`app_users?id=eq.${encodeURIComponent(user_id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ seller_credit_balance: 0, is_seller: true, career_levels: careerLevels }),
      });
    } catch (e) {
      // 🔴 venda/saldo falharam depois da reserva — devolve a peça, senão fica presa
      // 30 minutos sem carrinho nenhum de verdade por trás.
      await devolverItem({ saleId: reservaId }).catch(() => {});
      throw e;
    }

    // 📦 Baixa de verdade (Fase 1, atômica) — a reserva acima só travou a disponibilidade;
    // quem desconta `products.quantity` é sempre baixar_estoque_central. A venda já está
    // paga (saldo de adesão já foi debitado), então falta aqui vira log — não desfaz venda.
    const { faltas } = await baixarItensDaVenda({ ownerId: null, items: itensBaixa, saleId: reservaId });
    await consumirItensDaVenda({ saleId: reservaId }).catch(() => {});

    return res.status(200).json({
      success: true, sale_ids: saleIds, total, career_levels: careerLevels,
      ...(faltas.length ? { stock_errors: faltas } : {}),
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao fechar o pedido', details: String(e?.message || e) });
  }
}