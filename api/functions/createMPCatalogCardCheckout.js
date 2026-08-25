// createMPCatalogCardCheckout — cartão via Mercado Pago Checkout Pro (página hospedada do MP),
// substitui o antigo createStripeCheckout.js. Mesma estrutura: cria a venda pending_payment
// (kind: 'loja') e devolve a URL do checkout do Mercado Pago pra redirecionar.
// Confirmação/comissão/estoque continuam 100% no mpWebhook.js (mesmo motor do PIX).
import { oid } from '../_lib/oid.js';
import { calcularDesconto } from '../_lib/passaporteCoupon.js';
import { resolverFreteDoCheckout } from '../_lib/frete.js';
import { reservarItensDaVenda, devolverItem } from '../_lib/estoqueReserva.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilaonozap.net';
const round2 = (n) => Math.round(n * 100) / 100;

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
    const buyer = body?.buyer || {};
    const items = Array.isArray(body?.items) && body.items.length ? body.items : (body?.product_id ? [{ product_id: body.product_id, quantity: body.quantity || 1 }] : []);
    if (!buyer?.email || !items.length) return res.status(400).json({ success: false, error: 'Comprador e itens são obrigatórios' });
    if (!SUPABASE_URL || !SR || !MP_TOKEN) return res.status(500).json({ success: false, error: 'Config do servidor ausente (Mercado Pago/Supabase)' });

    const ids = items.map((i) => i.product_id).filter(Boolean);
    const prods = await (await sb(`products?select=id,description,price_catalog,selling_price_retail,image_urls&id=in.(${ids.map((x) => `"${x}"`).join(',')})`)).json();
    const pmap = Object.fromEntries((Array.isArray(prods) ? prods : []).map((p) => [p.id, p]));
    const unitPrice = (p) => (Number(p.price_catalog) > 0 ? Number(p.price_catalog) : Number(p.selling_price_retail) || 0);
    let total = 0; const lines = [];
    for (const it of items) { const p = pmap[it.product_id]; if (!p) continue; const q = Math.max(1, parseInt(it.quantity) || 1); total += unitPrice(p) * q; lines.push({ p, q }); }
    total = round2(total);
    if (total <= 0) return res.status(400).json({ success: false, error: 'Itens inválidos' });
    const main = lines[0].p;

    // 🥇 REGRA DE VENDA PESSOAL (absoluta, Santana 04/08/2026): quem tem cargo de rede é
    // SEMPRE o vendedor da própria compra — logado, deslogado, ou comprando pelo link de
    // outra pessoa. "Comprei na minha loja, automaticamente eu ganho." Vem ANTES do ref_code.
    // Trainee fica de fora: é papel de mentoria, sem percentual de venda direta.
    const CARGOS_REDE = [
      'influenciador', 'influencer', 'licenciado_aplicativo',
      'vendedor',
      'licenciado', 'licenciado_catalogo',
      'parceiro',
      'ponto_retirada',
      'loja_fisica',
      'distribuidor',
    ];
    let seller_id = null;
    // 🔴 PONTO 127 (25/08/2026) — este SELECT passa a trazer TAMBÉM telefone e endereço
    // do cadastro. Não é consulta nova: é a mesma que já existia, com mais colunas. Serve
    // de rede se a tela do cliente estiver em cache antigo e não mandar o telefone.
    let cadastro = null;
    if (buyer.id) {
      const me = await (await sb(`app_users?select=id,career_levels,phone,address_street,address_number,address_complement,address_neighborhood,address_city,address_state,address_zip_code&id=eq.${encodeURIComponent(buyer.id)}&limit=1`)).json();
      cadastro = Array.isArray(me) ? me[0] : null;
      const meusCargos = Array.isArray(cadastro?.career_levels) ? cadastro.career_levels : [];
      if (cadastro && meusCargos.some((c) => CARGOS_REDE.includes(c))) seller_id = cadastro.id;
    }
    const refCode = String(body?.ref_code || '').trim();
    if (!seller_id && refCode) { const r = await (await sb(`app_users?select=id&referral_code=eq.${encodeURIComponent(refCode)}&limit=1`)).json(); if (Array.isArray(r) && r[0]) seller_id = r[0].id; }
    if (!seller_id && buyer.id) { const b = await (await sb(`app_users?select=referred_by_id&id=eq.${encodeURIComponent(buyer.id)}&limit=1`)).json(); if (Array.isArray(b) && b[0]) seller_id = b[0].referred_by_id || null; }
    if (seller_id) {
      const ex = await (await sb(`app_users?select=id&id=eq.${encodeURIComponent(seller_id)}&limit=1`)).json();
      if (!Array.isArray(ex) || !ex.length) seller_id = null;
    }

    // 🎟️ Cupom Passaporte (crédito de 10% do aporte, somado entre todos os cupons
    // liberados do usuário) — validado no servidor. Débito real acontece em
    // debitarCupomDaVenda, no confirm do pagamento (FIFO por todos os cupons).
    let passaporte_desconto = 0;
    if (body?.use_passaporte === true && buyer?.id) {
      const abativel = round2(Math.max(0, total - 1));
      const pc = abativel > 0 ? await calcularDesconto(buyer.id, abativel) : null;
      if (pc) { passaporte_desconto = pc.desconto; }
    }
    const totalProdutos = round2(total - passaporte_desconto);

    // 🚚 frete recotado no servidor — totalProdutos (base da comissão) fica intacto.
    const addrS = body?.address || {};
    const fr = await resolverFreteDoCheckout({
      delivery_type: body?.delivery_type,
      cep: addrS?.zip || body?.cep,
      items,
      frete_id: body?.frete_id,
    });
    if (!fr.ok) return res.status(200).json({ success: false, error: fr.error });
    const frete = fr.frete;
    // 💳 TAXA DO CARTÃO REPASSADA AO CLIENTE (Gabriel, 04/08/2026): a loja não absorve
    // nada. Os juros do parcelamento já são cobrados do cliente pelo próprio MP; aqui
    // entra a taxa de venda que o MP descontava do recebimento. Fica FORA da base de
    // comissão (total_amount continua só o produto) — senão infla comissão de todo mundo.
    const TAXA_CARTAO_PCT = 5.31;
    const subtotal = round2(totalProdutos + frete.valor);
    const taxaCartao = round2(subtotal * (TAXA_CARTAO_PCT / 100));
    const totalCobrado = round2(subtotal + taxaCartao);
    if (totalCobrado < 1) return res.status(400).json({ success: false, error: 'Valor mínimo para pagamento: R$ 1,00' });

    const saleId = oid();

    // 🔴 PONTO 126 (21/08/2026) — RESERVA COM VALIDADE (Fase 2). Igual createMPPix.js:
    // até aqui não existia checagem de estoque nenhuma nesta rota. Reserva antes de
    // criar a venda e o checkout — se não couber, recusa aqui, sem gerar nada no MP.
    const reserva = await reservarItensDaVenda({
      ownerId: null,
      saleId,
      items: lines.map((l) => ({ product_id: l.p.id, qty: l.q, title: l.p.description })),
    });
    if (!reserva.ok) {
      return res.status(200).json({
        success: false,
        error: `Estoque insuficiente de "${(reserva.titulo || '').slice(0, 60)}" — outra pessoa já está pagando essa peça agora.`,
      });
    }

    await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      id: saleId, base44_id: saleId, buyer_id: buyer.id || null, buyer_email: buyer.email, buyer_name: buyer.name || null,
      seller_id, product_id: main.id, product_title: main.description, product_image: (main.image_urls && main.image_urls[0]) || null,
      sale_price: totalProdutos, total_amount: totalProdutos, quantity: lines.reduce((s, l) => s + l.q, 0), status: 'pending_payment',
      kind: 'loja', payment_method: 'credit_card_mp', tracking_code: 'LZ' + saleId.slice(0, 8).toUpperCase(), created_date: new Date().toISOString(),
      discount_amount: passaporte_desconto || null,
      raw_base44: { passaporte_desconto, delivery_type: body?.delivery_type || null, address: addrS, frete, amount_charged: totalCobrado, taxa_cartao: taxaCartao },
    }) });

    // Checkout Pro (página hospedada do Mercado Pago) — mesma UX de redirecionamento que a Stripe tinha.
    const [first, ...rest] = String(buyer.name || 'Cliente').trim().split(/\s+/);
    const mpItems = lines.map((l) => ({ title: String(l.p.description).slice(0, 120), quantity: l.q, unit_price: unitPrice(l.p), currency_id: 'BRL' }));
    if (frete.valor > 0) mpItems.push({ title: `Frete — ${[frete.empresa, frete.servico].filter(Boolean).join(' ')}`.slice(0, 120), quantity: 1, unit_price: frete.valor, currency_id: 'BRL' });
    if (passaporte_desconto > 0) mpItems.push({ title: 'Desconto Passaporte do Leilão', quantity: 1, unit_price: -passaporte_desconto, currency_id: 'BRL' });
    if (taxaCartao > 0) mpItems.push({ title: 'Taxa de pagamento no cartão', quantity: 1, unit_price: taxaCartao, currency_id: 'BRL' });

    // 🔴 PONTO 124 (21/08/2026) — CARTÃO SEM CPF NO PAYER, PIX SEMPRE MANDOU.
    // O CPF é coletado e validado na tela (Cart.jsx) e chega até aqui em `buyer.cpf`,
    // mas nunca era repassado ao Mercado Pago nesta preferência — createMPPix.js
    // (mesma estrutura, "mesmo motor do PIX" segundo o cabeçalho deste arquivo) sempre
    // mandou `payer.identification`, só o cartão ficou sem. Pagamento de cartão sem
    // identificação do comprador é justamente o que a antifraude do Mercado Pago mais
    // pesa pra recusar no Brasil — explica a recusa em cartões de pessoas diferentes,
    // não é problema do cartão de ninguém.

    // ══════════════════════════════════════════════════════════════════════════
    // 🔴 PONTO 127 (25/08/2026) — CARTÃO RECUSADO POR "RISCO": FALTAVA TELEFONE,
    //    ENDEREÇO E DADO DE ENTREGA NA REQUISIÇÃO.
    // ══════════════════════════════════════════════════════════════════════════
    // Não é hipótese. Consultamos a API do Mercado Pago (mpDiagRecusas) e nas 30
    // últimas recusas 22 (73%) vieram com o código `cc_rejected_high_risk` — o
    // antifraude do MP, não o banco do cliente. E no pagamento aberto por dentro,
    // tudo o que tinha chegado lá do nosso lado era:
    //
    //     "payer": { "first_name": "João", "last_name": "Vitor Paim" }
    //
    // Só o nome. Sem telefone, sem endereço, sem destino da entrega. O antifraude
    // avalia o comprador com o que recebe; recebendo quase nada, ele recusa por
    // precaução. Por isso a recusa acontecia com cartões de pessoas diferentes:
    // o problema nunca foi o cartão de ninguém.
    //
    // A tela do carrinho JÁ coleta telefone (obrigatório, Cart.jsx) e endereço
    // completo (obrigatório na entrega). O dado existia e parava aqui.
    //
    // Nomes dos campos conferidos no SDK oficial do Mercado Pago
    // (mercadopago/sdk-nodejs, PreferenceRequest / Shipments / ReceiverAddress):
    //   payer.phone   = { area_code, number }
    //   payer.address = { zip_code, street_name, street_number }
    //   shipments     = { mode, receiver_address: { zip_code, street_name,
    //                     street_number, city_name, state_name, ... } }
    // `mode: 'not_specified'` é obrigatório aqui: sem ele o MP pode assumir que nós
    // queremos que ELE calcule o frete (Mercado Envios). Nós já cobramos o frete
    // como item, então ele só recebe o endereço — não organiza entrega nenhuma.
    const soDigitos = (v) => String(v || '').replace(/\D/g, '');

    // Tira o 55 do começo quando a pessoa digita o país junto ("+55 11 9..."). Sem isso
    // o DDD viraria "55" e o antifraude receberia um telefone que não existe — pior do
    // que não mandar nada.
    let telDigitos = soDigitos(buyer.phone || cadastro?.phone);
    if (telDigitos.length > 11 && telDigitos.startsWith('55')) telDigitos = telDigitos.slice(2);
    const payerPhone = telDigitos.length === 10 || telDigitos.length === 11
      ? { area_code: telDigitos.slice(0, 2), number: telDigitos.slice(2) }
      : null;

    const rua = String(addrS.street || cadastro?.address_street || '').trim();
    const numero = String(addrS.number || cadastro?.address_number || '').trim();
    const cepEnt = soDigitos(addrS.zip || cadastro?.address_zip_code);
    const cidade = String(addrS.city || cadastro?.address_city || '').trim();
    const uf = String(addrS.state || cadastro?.address_state || '').trim();
    const bairro = String(addrS.neighborhood || cadastro?.address_neighborhood || '').trim();
    const complemento = String(addrS.complement || cadastro?.address_complement || '').trim();

    const payerAddress = cepEnt.length === 8
      ? { zip_code: cepEnt, street_name: rua || 'Não informado', street_number: numero || 'S/N' }
      : null;

    // Entrega só existe quando é entrega. Retirada não tem destino a declarar.
    const ehEntrega = String(body?.delivery_type || '') === 'delivery';
    const shipments = ehEntrega && payerAddress
      ? {
          mode: 'not_specified',
          receiver_address: {
            zip_code: cepEnt,
            street_name: [rua, bairro].filter(Boolean).join(' - ') || 'Não informado',
            street_number: numero || 'S/N',
            ...(complemento ? { apartment: complemento.slice(0, 60) } : {}),
            ...(cidade ? { city_name: cidade } : {}),
            ...(uf ? { state_name: uf } : {}),
            country_name: 'Brasil',
          },
        }
      : null;

    const prefBody = {
      items: mpItems,
      payer: {
        email: buyer.email,
        name: first || 'Cliente',
        surname: rest.join(' ') || 'NoZap',
        ...(buyer.cpf ? { identification: { type: 'CPF', number: String(buyer.cpf).replace(/\D/g, '') } } : {}),
        ...(payerPhone ? { phone: payerPhone } : {}),
        ...(payerAddress ? { address: payerAddress } : {}),
      },
      ...(shipments ? { shipments } : {}),
      // O que aparece na fatura do cartão do cliente. Nome irreconhecível na fatura
      // é uma das causas de contestação — e contestação piora a reputação da conta,
      // que é o que o antifraude olha na próxima compra.
      statement_descriptor: 'LEILAONOZAP',
      external_reference: saleId,
      notification_url: `${BASE_URL}/api/functions/mpWebhook`,
      back_urls: {
        success: `${BASE_URL}/MyCatalogOrders?paid=1`,
        failure: `${BASE_URL}/Cart`,
        pending: `${BASE_URL}/Cart`,
      },
      auto_return: 'approved',
      // 💳 Só cartão de crédito nesta tela — PIX já tem seu próprio fluxo (createMPPix).
      payment_methods: {
        excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'bank_transfer' }, { id: 'debit_card' }, { id: 'digital_wallet' }],
        installments: 12,
      },
    };
    // Devolve { ok, pref } sempre — resposta que não for JSON (página de erro, HTML de
    // manutenção) não pode estourar aqui: se estourar, a peça fica reservada 30 minutos
    // por um checkout que nunca existiu.
    const criarPreferencia = async (corpo) => {
      const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST', headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
      });
      const texto = await resp.text().catch(() => '');
      let json = null;
      try { json = JSON.parse(texto); } catch { json = { message: texto.slice(0, 300) }; }
      return { ok: resp.ok, pref: json };
    };

    let r = await criarPreferencia(prefBody);
    let pref = r.pref;

    // 🛟 REDE DE SEGURANÇA. Se por qualquer motivo o Mercado Pago recusar a
    // preferência com os dados novos (um CEP torto, um campo que ele passe a
    // validar diferente), a compra NÃO pode morrer aqui: tenta de novo exatamente
    // como era antes desta correção. Pior caso = o comportamento de hoje, nunca
    // um checkout a menos. O log diz qual foi o campo, pra corrigir depois.
    if (!r.ok || !pref?.id) {
      console.error('[MP-CARD] preferência recusada COM dados do pagador — refazendo sem eles. Resposta do MP:', JSON.stringify(pref || {}).slice(0, 600));
      const semEnriquecer = { ...prefBody };
      delete semEnriquecer.shipments;
      delete semEnriquecer.statement_descriptor;
      semEnriquecer.payer = {
        email: buyer.email,
        name: first || 'Cliente',
        surname: rest.join(' ') || 'NoZap',
        ...(buyer.cpf ? { identification: { type: 'CPF', number: String(buyer.cpf).replace(/\D/g, '') } } : {}),
      };
      r = await criarPreferencia(semEnriquecer);
      pref = r.pref;
    }

    if (!r.ok || !pref?.id) {
      // 🔴 PONTO 126: reservou, mas o checkout não nasceu — devolve, senão a peça fica
      // presa 30 minutos por um link que nunca vai existir.
      await devolverItem({ saleId }).catch(() => {});
      return res.status(200).json({ success: false, error: 'Falha ao criar checkout', details: (pref?.message || JSON.stringify(pref)).slice(0, 300) });
    }

    await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ mp_preference_id: pref.id }) });
    return res.status(200).json({ success: true, sale_id: saleId, amount: totalCobrado, amount_products: totalProdutos, shipping: frete.valor, taxa_cartao: taxaCartao, url: pref.init_point, preference_id: pref.id, passaporte_desconto });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao criar checkout', details: String(e?.message || e) });
  }
}