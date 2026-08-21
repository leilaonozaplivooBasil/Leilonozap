// createSupplyOrder — PEDIDO DE REPOSIÇÃO (compra firme do lojista no estoque central).
//
// REGRA OFICIAL (Gabriel, 08/08/2026):
// • O lojista compra pagando (preço de venda − percentual da licença dele), mesma
//   escada de cargos usada na comissão de venda direta (career_levels).
// • O FRETE da remessa é por conta DELE e entra por fora (frete nunca vira base de nada).
// • Formas de pagamento: SALDO DE COMISSÃO, PIX ou CARTÃO. Dinheiro não existe aqui —
//   dinheiro vira saldo (depósito) antes.
// • O estoque SÓ é movimentado quando o pagamento confirma (api/_lib/supplySettle.js).
// • Isto NÃO é venda ao consumidor: não paga comissão nenhuma. É abastecimento.
//
// O pedido nasce em catalog_sales com kind='reposicao' de propósito: assim ele
// reaproveita o flip atômico e a idempotência do mpWebhook já validados em produção,
// sem criar um segundo caminho de confirmação de pagamento.
import { oid } from '../_lib/oid.js';
import { bestSellingLevel } from '../_lib/networkChain.js';
import { resolverFreteDoCheckout } from '../_lib/frete.js';
import { aplicarReposicao } from '../_lib/supplySettle.js';
import { exigirSessao } from '../_lib/sessao.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilaonozap.net';
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

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
    const actorId = String(body?.actorId || '').trim();
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, actorId, 'createSupplyOrder');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    const items = Array.isArray(body?.items) ? body.items : [];
    // 'saldo' = comissão (sacável) · 'operacao' = dinheiro depositado da rua (não sacável)
    const paymentMethod = ['saldo', 'operacao', 'pix', 'card'].includes(body?.payment_method) ? body.payment_method : 'pix';
    if (!actorId || !items.length) return res.status(400).json({ success: false, error: 'Operador e itens são obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // ── 1) quem está comprando e qual o desconto da licença dele ──────────────
    const uArr = await (await sb(`app_users?select=id,full_name,email,phone,commission_balance,saldo_operacao,career_levels,primary_career_level&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const loja = Array.isArray(uArr) ? uArr[0] : null;
    if (!loja) return res.status(403).json({ success: false, error: 'Usuário inválido' });

    // 🔓 REGRA OFICIAL (Gabriel, 08/08/2026): estoque próprio vale DO VENDEDOR PARA CIMA.
    // O influenciador divulga, não estoca — por isso é o único cargo de fora.
    const cargos = [...(Array.isArray(loja.career_levels) ? loja.career_levels : []), loja.primary_career_level].filter(Boolean);
    const SEM_ESTOQUE = ['influenciador', 'influencer'];
    const soInfluenciador = cargos.length > 0 && cargos.every((c) => SEM_ESTOQUE.includes(c));
    if (soInfluenciador) {
      return res.status(200).json({ success: false, error: 'O perfil de influenciador não trabalha com estoque próprio. Evolua para vendedor para comprar mercadoria.' });
    }

    const levelsArr = await (await sb('career_levels?select=id,nome,venda_direta_pct')).json();
    const levels = {};
    (Array.isArray(levelsArr) ? levelsArr : []).forEach((l) => { levels[l.id] = l; });
    const licenca = bestSellingLevel(loja, levels);
    const descontoPct = Number(licenca.pct) || 0;
    if (descontoPct <= 0) {
      return res.status(200).json({ success: false, error: 'Seu cargo ainda não tem desconto de compra. Evolua sua licença para comprar estoque próprio.' });
    }

    // ── 2) produtos e conferência do estoque central ──────────────────────────
    const ids = [...new Set(items.map((i) => String(i.product_id)).filter(Boolean))];
    if (!ids.length) return res.status(400).json({ success: false, error: 'Itens inválidos' });
    const inList = ids.map((i) => `"${encodeURIComponent(i)}"`).join(',');
    const prods = await (await sb(`products?select=id,description,price_catalog,selling_price_retail,quantity,image_urls&id=in.(${inList})`)).json();
    const pmap = {}; (Array.isArray(prods) ? prods : []).forEach((p) => { pmap[String(p.id)] = p; });

    let bruto = 0, totalQty = 0; const lines = [];
    for (const it of items) {
      const p = pmap[String(it.product_id)];
      if (!p) return res.status(200).json({ success: false, error: 'Um produto saiu do estoque. Atualize a página.' });
      const qty = Math.max(1, Number(it.quantity) || 1);
      if ((Number(p.quantity) || 0) < qty) {
        return res.status(200).json({ success: false, error: `Estoque central insuficiente de "${(p.description || '').slice(0, 40)}" (tem ${Number(p.quantity) || 0}).` });
      }
      const cheio = round2(p.price_catalog || p.selling_price_retail || 0);
      if (cheio <= 0) return res.status(200).json({ success: false, error: `"${(p.description || '').slice(0, 40)}" está sem preço cadastrado.` });
      const comDesconto = round2(cheio * (1 - descontoPct / 100));
      bruto += cheio * qty; totalQty += qty;
      lines.push({ product_id: String(p.id), title: String(p.description || '').slice(0, 200), qty, unit: comDesconto, unit_cheio: cheio });
    }
    bruto = round2(bruto);
    const descontoValor = round2(bruto * descontoPct / 100);
    const liquido = round2(bruto - descontoValor);
    if (liquido <= 0) return res.status(400).json({ success: false, error: 'Total inválido' });

    // ── 3) frete da remessa (por conta do lojista) ────────────────────────────
    const fr = await resolverFreteDoCheckout({
      delivery_type: body?.delivery_type === 'delivery' ? 'delivery' : 'pickup',
      cep: body?.cep,
      items,
      frete_id: body?.frete_id,
    });
    if (!fr.ok) return res.status(200).json({ success: false, error: fr.error });
    const frete = fr.frete;
    const totalCobrado = round2(liquido + (Number(frete.valor) || 0));

    // ── 4) grava o pedido ─────────────────────────────────────────────────────
    const saleId = oid();
    const title = lines.length === 1 ? lines[0].title : `Reposição: ${lines[0].title} +${lines.length - 1} item(ns)`;
    const raw = {
      reposicao: true, loja_id: loja.id, desconto_pct: descontoPct, licenca: licenca.level,
      bruto, desconto_valor: descontoValor, frete, amount_charged: totalCobrado, items: lines,
    };
    const pedido = {
      id: saleId, base44_id: saleId, kind: 'reposicao', source: 'reposicao',
      buyer_id: loja.id, buyer_name: loja.full_name, buyer_email: loja.email || null, buyer_phone: loja.phone || null,
      seller_id: null,
      product_title: String(title).slice(0, 300),
      // Foto do produto: só quando é 1 item (pedido multi-item não tem "a" foto certa).
      product_id: lines.length === 1 ? lines[0].product_id : null,
      product_image: lines.length === 1 ? (pmap[lines[0].product_id]?.image_urls?.[0] || null) : null,
      // liquido = o que a casa recebe pelos produtos. O frete fica de fora, como em toda venda.
      sale_price: liquido, total_amount: liquido, quantity: totalQty,
      items_json: lines, raw_base44: raw,
      status: 'pending_payment', payment_method: paymentMethod === 'saldo' ? 'saldo' : (paymentMethod === 'card' ? 'credit_card_mp' : 'pix_mp'),
      created_date: new Date().toISOString(),
    };
    let ins = await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(pedido) });
    if (!ins.ok) {
      // Algumas instalações exigem seller_id preenchido. A reposição é uma compra da
      // própria loja com a casa — usar o id dela aqui não gera comissão nenhuma,
      // porque o caminho 'reposicao' desvia antes de qualquer motor de comissão.
      ins = await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ...pedido, seller_id: loja.id }) });
      if (!ins.ok) { const t = await ins.text(); return res.status(200).json({ success: false, error: 'Falha ao criar pedido', details: t.slice(0, 200) }); }
      pedido.seller_id = loja.id;
    }

    const resumo = {
      sale_id: saleId, bruto, desconto_pct: descontoPct, desconto_valor: descontoValor,
      liquido, frete: round2(frete.valor || 0), total: totalCobrado, itens: lines.length,
      licenca: levels[licenca.level]?.nome || licenca.level,
    };

    // ── 5) pagamento ──────────────────────────────────────────────────────────
    if (paymentMethod === 'saldo' || paymentMethod === 'operacao') {
      // Débito condicional no banco: só passa se a carteira ainda cobrir o valor,
      // então dois pedidos ao mesmo tempo nunca deixam a carteira negativa.
      const col = paymentMethod === 'operacao' ? 'saldo_operacao' : 'commission_balance';
      const nome = paymentMethod === 'operacao' ? 'Saldo de operação' : 'Saldo de comissão';
      const saldoAtual = round2(loja[col]);
      if (saldoAtual < totalCobrado) {
        await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'canceled' }) });
        return res.status(200).json({ success: false, error: `${nome} insuficiente. Disponível: R$ ${saldoAtual.toFixed(2)} · Pedido: R$ ${totalCobrado.toFixed(2)}. Faltam R$ ${(totalCobrado - saldoAtual).toFixed(2)} — deposite saldo ou pague este pedido no PIX/cartão.`, saldo: saldoAtual });
      }
      const deb = await sb(`app_users?id=eq.${encodeURIComponent(loja.id)}&${col}=gte.${totalCobrado}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ [col]: round2(saldoAtual - totalCobrado) }),
      });
      const debOk = deb.ok ? await deb.json() : null;
      if (!Array.isArray(debOk) || !debOk.length) {
        await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'canceled' }) });
        return res.status(200).json({ success: false, error: 'Não foi possível debitar o saldo. Tente novamente.' });
      }
      const flip = await sb(`catalog_sales?id=eq.${saleId}&status=eq.pending_payment`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'paid' }),
      });
      const flipped = await flip.json().catch(() => []);
      if (!Array.isArray(flipped) || !flipped.length) {
        // não conseguiu confirmar o pedido: devolve o dinheiro na MESMA carteira, nada some
        await sb(`app_users?id=eq.${encodeURIComponent(loja.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ [col]: saldoAtual }) });
        return res.status(200).json({ success: false, error: 'Não foi possível confirmar o pedido. Nada foi cobrado.' });
      }
      const ap = await aplicarReposicao(flipped[0]);
      return res.status(200).json({ success: true, pago: true, ...resumo, carteira: col, saldo_restante: round2(saldoAtual - totalCobrado), estoque: ap });
    }

    if (!MP_TOKEN) return res.status(500).json({ success: false, error: 'Pagamento indisponível no momento' });
    const [first, ...rest] = String(loja.full_name || 'Lojista').trim().split(/\s+/);

    if (paymentMethod === 'pix') {
      if (totalCobrado < 1) return res.status(200).json({ success: false, error: 'Valor mínimo do PIX: R$ 1,00' });
      const mp = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': saleId },
        body: JSON.stringify({
          transaction_amount: totalCobrado,
          description: `Reposição de estoque - Leilão NoZap`.slice(0, 200),
          payment_method_id: 'pix',
          notification_url: `${BASE_URL}/api/functions/mpWebhook`,
          external_reference: saleId,
          payer: { email: loja.email || `lojista+${saleId.slice(0, 8)}@leilaonozap.net`, first_name: first || 'Lojista', last_name: rest.join(' ') || 'NoZap' },
        }),
      });
      const pay = await mp.json();
      if (!mp.ok || !pay?.id) {
        await sb(`catalog_sales?id=eq.${saleId}&status=eq.pending_payment`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'canceled' }) });
        return res.status(200).json({ success: false, error: 'Falha ao gerar PIX', details: (pay?.message || '').slice(0, 200) });
      }
      const td = pay.point_of_interaction?.transaction_data || {};
      await sb(`catalog_sales?id=eq.${saleId}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ mp_payment_id: String(pay.id), pix_qr: td.qr_code || null, pix_qr_base64: td.qr_code_base64 || null, pix_ticket_url: td.ticket_url || null }),
      });
      return res.status(200).json({ success: true, gateway: 'pix', ...resumo, pix: { payment_id: String(pay.id), pix_code: td.qr_code || null, qr_code_base64: td.qr_code_base64 || null, ticket_url: td.ticket_url || null } });
    }

    // cartão — Checkout Pro do Mercado Pago (mesma página já usada na loja)
    const prefBody = {
      items: [
        ...lines.map((ln) => ({ title: ln.title || 'Produto', quantity: ln.qty, unit_price: ln.unit, currency_id: 'BRL' })),
        ...(Number(frete.valor) > 0 ? [{ title: `Frete - ${[frete.empresa, frete.servico].filter(Boolean).join(' ') || 'Entrega'}`.slice(0, 200), quantity: 1, unit_price: round2(frete.valor), currency_id: 'BRL' }] : []),
      ],
      payer: { email: loja.email || 'lojista@leilaonozap.net', name: first || 'Lojista', surname: rest.join(' ') || 'NoZap' },
      external_reference: saleId,
      notification_url: `${BASE_URL}/api/functions/mpWebhook`,
      back_urls: { success: `${BASE_URL}/painel/comprar-estoque?pago=${saleId.slice(0, 8)}`, failure: `${BASE_URL}/painel/comprar-estoque`, pending: `${BASE_URL}/painel/comprar-estoque` },
      auto_return: 'approved',
      payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'bank_transfer' }], installments: 12 },
    };
    const sr = await fetch('https://api.mercadopago.com/checkout/preferences', { method: 'POST', headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(prefBody) });
    const pref = await sr.json();
    if (!sr.ok || !pref?.id) {
      await sb(`catalog_sales?id=eq.${saleId}&status=eq.pending_payment`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'canceled' }) });
      return res.status(200).json({ success: false, error: 'Falha ao abrir o cartão', details: (pref?.message || '').slice(0, 200) });
    }
    await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ mp_preference_id: pref.id }) });
    return res.status(200).json({ success: true, gateway: 'card', ...resumo, url: pref.init_point });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao criar pedido de reposição', details: String(e?.message || e) });
  }
}