// createPdvOrder — tirador de pedido (PDV) do Distribuidor: grava venda física em catalog_sales
// e baixa o estoque (products). service_role. Guard: ator admin/super_admin OU cargo de estoque.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
import { fulfillStoreOrder } from '../_lib/storeFulfill.js';
// 🏪 regra EXCLUSIVA do balcão: preço cheio + comissão da licença de quem compra e rebate do balcão
import { carregarTabelasBalcao, buscarUsuario, comissaoDaLicenca, pagarComissaoBalcao } from '../_lib/pdvBalcao.js';
// 📦 regra única de baixa + repasse do estoque próprio (comprado/consignado)
import { baixarItensDaVenda } from '../_lib/baixaEstoque.js';
import { liberarRepasseEstoqueProprio } from '../_lib/repasseEstoqueProprio.js';
// 🤝 consignado: a dívida da peça MORRE nesta venda. Se o cliente pagou em
// dinheiro, o custo sai do saldo dele — e sem saldo a venda não fecha.
import { preverConsignado, liquidarConsignado } from '../_lib/consignadoSettle.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilonozap.vercel.app';
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const STOCK_CARGOS = ['distribuidor', 'loja_fisica', 'ponto_retirada'];

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
    const items = Array.isArray(body?.items) ? body.items : [];
    const customer = body?.customer || {};
    const paymentMethod = String(body?.payment_method || 'dinheiro');
    const delivered = !!body?.delivered; // retirada no balcão = entregue na hora
    const vendedorId = String(body?.vendedor_id || '').trim(); // venda vinculada a um vendedor (comissão)
    const compradorId = String(body?.comprador_id || '').trim(); // quem está levando (licença) — desconto de balcão
    if (!actorId || !items.length) return res.status(400).json({ success: false, error: 'Operador e itens são obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // guard: ator admin OU cargo de estoque OU funcionário de PDV ativo
    const actorArr = await (await sb(`app_users?select=id,full_name,role,career_levels,primary_career_level,is_pdv_operator,employer_id,active&id=eq.${encodeURIComponent(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    if (!actor) return res.status(403).json({ success: false, error: 'Operador inválido' });
    const isAdmin = ['admin', 'super_admin'].includes(actor.role);
    const hasStock = Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK_CARGOS.includes(c));
    const isEmployee = actor.is_pdv_operator === true && actor.active !== false;
    // 🔓 REGRA OFICIAL (Gabriel, 08/08/2026): tirar pedido vale DO VENDEDOR PARA CIMA —
    // o cara está na rua, com o cliente na frente, e precisa fechar a venda ali.
    // O influenciador é o único de fora: ele divulga, não vende estoque.
    const cargosAtor = [...(Array.isArray(actor.career_levels) ? actor.career_levels : []), actor.primary_career_level].filter(Boolean);
    const soInfluenciador = cargosAtor.length > 0 && cargosAtor.every((c) => ['influenciador', 'influencer'].includes(c));
    if (soInfluenciador) return res.status(403).json({ success: false, error: 'O perfil de influenciador não tira pedido de estoque. Evolua para vendedor.' });
    if (!isAdmin && !hasStock && !isEmployee && !cargosAtor.length) return res.status(403).json({ success: false, error: 'Sem permissão para tirar pedido' });
    const employerId = isEmployee ? (actor.employer_id || null) : null;
    // dono de loja (loja_fisica/ponto/parceiro) vende do PRÓPRIO store_inventory
    const isStoreOwner = ['loja_fisica', 'ponto_retirada', 'parceiro'].includes(actor.primary_career_level);

    // lê produtos (preço de referência + estoque + dono)
    const ids = items.map((i) => String(i.product_id)).filter(Boolean);
    if (!ids.length) return res.status(400).json({ success: false, error: 'Itens inválidos' });
    const inList = ids.map((i) => `"${encodeURIComponent(i)}"`).join(',');
    const prods = await (await sb(`products?select=id,description,price_catalog,selling_price_retail,quantity,quantity_sold,sold_amount,distribuidor_id&id=in.(${inList})`)).json();
    const pmap = {}; (Array.isArray(prods) ? prods : []).forEach((p) => { pmap[p.id] = p; });

    // estoque da loja (quando for dono de loja)
    const siMap = {};
    if (isStoreOwner) {
      const si = await (await sb(`store_inventory?select=id,product_id,quantity,price&owner_id=eq.${encodeURIComponent(actorId)}&product_id=in.(${inList})`)).json();
      (Array.isArray(si) ? si : []).forEach((s) => { siMap[s.product_id] = s; });
    }

    let total = 0, totalQty = 0; const lines = []; let sellerId = null;
    for (const it of items) {
      const p = pmap[String(it.product_id)];
      if (!p) continue;
      const qty = Math.max(1, Number(it.quantity) || 1);
      if (isStoreOwner) {
        const si = siMap[String(it.product_id)];
        if (!si) return res.status(200).json({ success: false, error: `"${(p.description || '').slice(0, 40)}" não está na sua loja.` });
        if ((Number(si.quantity) || 0) < qty) return res.status(200).json({ success: false, error: `Estoque insuficiente de "${(p.description || '').slice(0, 40)}" (tem ${Number(si.quantity) || 0}).` });
        const unit = it.price != null && it.price !== '' ? round2(it.price) : round2(si.price || p.price_catalog || 0);
        total += unit * qty; totalQty += qty;
        lines.push({ p, qty, unit, si });
      } else {
        const unit = it.price != null && it.price !== '' ? round2(it.price) : round2(p.price_catalog || p.selling_price_retail || 0);
        total += unit * qty; totalQty += qty;
        sellerId = sellerId || p.distribuidor_id || null;
        lines.push({ p, qty, unit });
      }
    }
    if (!lines.length) return res.status(400).json({ success: false, error: 'Nenhum produto válido' });
    total = round2(total);

    // 🏷️ BALCÃO NÃO TEM DESCONTO NO PREÇO. Quem se identifica paga o valor cheio e recebe
    // o percentual da própria licença como COMISSÃO no escritório virtual dele (pagamento
    // acontece mais abaixo, junto com o rebate do balcão).
    const totalBruto = total;
    let comprador = null, tabelas = null, comissaoInfo = null;
    if (compradorId) {
      comprador = await buscarUsuario(compradorId);
      if (!comprador) return res.status(200).json({ success: false, error: 'Pessoa da licença não encontrada' });
      tabelas = await carregarTabelasBalcao();
      comissaoInfo = comissaoDaLicenca(comprador, tabelas.levels);
    }

    // 🧭 PADRÃO OFICIAL DA COMISSÃO DE VENDA (Gabriel, 18/08/2026) — "QUEM VENDE RECEBE".
    //
    // A comissão de venda é SEMPRE de quem tirou o pedido e sobe pela árvore genealógica
    // dele — igual à loja virtual e ao leilão. Uma régua só. O que muda de caso pra caso
    // NÃO é a comissão de venda, é a MARGEM DA MERCADORIA: essa só existe pra quem é dono
    // da peça, e já é paga separadamente pela baixa de estoque próprio
    // (liberarRepasseEstoqueProprio, mais abaixo). Duas coisas diferentes, dois pagamentos.
    //
    // ⚠️ TRAVA REMOVIDA NESTA DATA: antes o pedido era BLOQUEADO quando o
    // `distribuidor_id` do produto era diferente de quem operava ("Este produto pertence a
    // outro distribuidor"). Dois erros nisso:
    //   1) `distribuidor_id` NÃO significa dono do estoque — o estoque CENTRAL está marcado
    //      com o id de um distribuidor, então a trava julgava por dado errado;
    //   2) desde que o PDV foi aberto pra rede toda, o vendedor de rua vende do estoque
    //      CENTRAL. Ele recebia o dinheiro do cliente, comprava saldo e era barrado no
    //      último clique — 100% dos produtos travavam pra ele (caso Elenice, 18/08/2026).
    // Venda de rua paga em saldo é VENDA DE LOJA VIRTUAL: o cliente pagou de verdade, o
    // dinheiro entrou via depósito e o saldo é só o canal. O método de pagamento NUNCA
    // decide a régua de comissão — decide só por onde o dinheiro chegou.
    //
    // O que protege o dinheiro NÃO era essa comparação, e continua de pé mais abaixo: o
    // pedido só fecha se a carteira de quem opera cobrir o valor (débito condicional no
    // banco) e a peça consignada trava sem cobertura.
    //
    // Admin/super_admin segue como sempre: opera EM NOME do distribuidor dono do produto.
    const donoProduto = sellerId; // veio do distribuidor_id dos itens (se houver)
    if (!isStoreOwner && !isAdmin) {
      // quem operou é quem vendeu → a comissão sobe pela árvore DELE
      sellerId = employerId || actorId;
    } else {
      sellerId = isStoreOwner ? actorId : (donoProduto || employerId || actorId);
    }

    // 🧑‍💼 venda vinculada a um vendedor da rede → a venda passa a ser DELE (e ele ganha comissão)
    let vendedor = null;
    if (vendedorId && !isStoreOwner) {
      const vArr = await (await sb(`app_users?select=id,full_name,primary_career_level&id=eq.${encodeURIComponent(vendedorId)}&limit=1`)).json();
      vendedor = Array.isArray(vArr) ? vArr[0] : null;
      if (vendedor) sellerId = vendedor.id;
    }

    const now = new Date().toISOString();
    const saleId = oid();
    const title = lines.length === 1 ? lines[0].p.description : `${lines[0].p.description} +${lines.length - 1} item(ns)`;
    const itemsJson = lines.map((ln) => ({ product_id: ln.p.id, title: String(ln.p.description || '').slice(0, 200), qty: ln.qty, unit: ln.unit }));

    // 🤝 CONSIGNADO — TRAVA ANTES DE QUALQUER COISA (regra oficial 08/08/2026).
    // Se esta venda vai puxar peça consignada e o cliente está pagando em dinheiro
    // (ou saldo), o custo sai do bolso dele NA HORA. Sem cobertura, a venda não sai:
    // é assim que ninguém termina uma venda ainda devendo a mercadoria.
    const donoEstoquePrevisto = isStoreOwner ? actorId : sellerId;
    const previsaoConsignado = await preverConsignado({ ownerId: donoEstoquePrevisto, items: itemsJson, paymentMethod });
    if (!previsaoConsignado.ok) {
      return res.status(200).json({ success: false, error: previsaoConsignado.erro, consignado: true, custo_consignado: previsaoConsignado.custo, saldo: previsaoConsignado.saldo });
    }

    // 💳 PIX REAL (Mercado Pago) — o pedido nasce 'pending_payment' e NÃO baixa estoque
    // nem paga comissão. Isso só acontece quando o dinheiro CAI de verdade:
    // mpWebhook → settlePdvPixSale (api/_lib/pdvSettle.js). Acaba o "paguei sem pagar".
    if (paymentMethod === 'pix') {
      if (!MP_TOKEN) return res.status(500).json({ success: false, error: 'Mercado Pago não configurado' });
      if (total < 1) return res.status(200).json({ success: false, error: 'Valor mínimo do PIX: R$ 1,00' });
      const pending = {
        id: saleId, base44_id: saleId, kind: 'produto', source: 'pdv',
        seller_id: sellerId, operator_id: actorId,
        buyer_name: customer.name || 'Cliente balcão', buyer_email: customer.email || null, buyer_phone: customer.phone || null,
        product_title: String(title).slice(0, 300), sale_price: total, total_amount: total, quantity: totalQty,
        items_json: itemsJson, status: 'pending_payment', payment_method: 'pix',
        // dados que o settle precisa na confirmação (fonte do estoque + entrega)
        // comprador_id + total_bruto viajam junto: quando o PIX confirmar, o settle paga
        // a comissão pela MESMA regra de balcão (e sobre o valor cheio, não o descontado).
        raw_base44: { pdv: true, is_store_owner: isStoreOwner, delivered, operator_id: actorId, items: itemsJson, comprador_id: compradorId || null, balcao_id: sellerId, total_bruto: totalBruto },
      };
      let ins = await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(pending) });
      if (!ins.ok) {
        // fallback sem colunas extras — raw_base44 e items_json ficam (o settle depende deles)
        const { operator_id, buyer_email, ...menor } = pending;
        ins = await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(menor) });
        if (!ins.ok) { const t = await ins.text(); return res.status(200).json({ success: false, error: 'Falha ao criar pedido', details: t.slice(0, 200) }); }
      }
      // cria a cobrança PIX no MP (mesmo motor da Loja Virtual)
      const [first, ...rest] = String(customer.name || 'Cliente Balcão').trim().split(/\s+/);
      const mp = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': saleId },
        body: JSON.stringify({
          transaction_amount: total,
          description: `PDV Balcão - ${title}`.slice(0, 200),
          additional_info: { items: itemsJson.map((l) => ({ title: String(l.title).slice(0, 120), quantity: l.qty, unit_price: l.unit })) },
          payment_method_id: 'pix',
          notification_url: `${BASE_URL}/api/functions/mpWebhook`,
          external_reference: saleId,
          payer: { email: customer.email || `pdv+${saleId.slice(0, 8)}@leilaonozap.net`, first_name: first || 'Cliente', last_name: rest.join(' ') || 'Balcão' },
        }),
      });
      const pay = await mp.json();
      if (!mp.ok || !pay?.id) {
        // não deixa pedido órfão: cancela o pending recém-criado
        await sb(`catalog_sales?id=eq.${saleId}&status=eq.pending_payment`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'canceled' }) });
        return res.status(200).json({ success: false, error: 'Falha ao gerar PIX', details: (pay?.message || JSON.stringify(pay)).slice(0, 300) });
      }
      const td = pay.point_of_interaction?.transaction_data || {};
      await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
        mp_payment_id: String(pay.id), pix_qr: td.qr_code || null, pix_qr_base64: td.qr_code_base64 || null, pix_ticket_url: td.ticket_url || null,
      }) });
      return res.status(200).json({
        success: true, pending: true, sale_id: saleId, total, total_bruto: totalBruto, comissao_licenca: comissaoInfo, items: lines.length,
        pix: { payment_id: String(pay.id), pix_code: td.qr_code || null, qr_code_base64: td.qr_code_base64 || null, ticket_url: td.ticket_url || null },
      });
    }

    const sale = {
      id: saleId, base44_id: saleId, kind: 'produto', source: 'pdv',
      seller_id: sellerId, operator_id: actorId,
      buyer_name: customer.name || 'Cliente balcão', buyer_email: customer.email || null, buyer_phone: customer.phone || null,
      product_title: String(title).slice(0, 300), sale_price: total, total_amount: total, quantity: totalQty,
      items_json: itemsJson,
      status: delivered ? 'entregue' : 'paid', payment_method: paymentMethod,
      ...(delivered ? { delivered_at: now } : {}),
    };
    // 💳 PAGAMENTO EM SALDO — o balcão compra saldo da plataforma antes e a venda física
    // debita da carteira DELE (o cliente pagou em dinheiro/máquina no balcão).
    // Débito condicional no próprio banco: só passa se o saldo ainda cobrir o valor,
    // então dois pedidos ao mesmo tempo nunca deixam a carteira negativa.
    const walletOwnerId = employerId || actorId;
    let saldoRestante = null;
    // ⚠️ REGRA OFICIAL (08/08/2026): no balcão o pedido é pago pelo saldo de COMISSÃO
    // ou pelo SALDO DE OPERAÇÃO (dinheiro que ele recebeu do cliente e depositou).
    // saldo_disponivel continua FORA: é crédito de leilão e pode estar lastreando
    // lance vivo — gastá-lo aqui deixaria o leilão descoberto.
    const colSaldo = paymentMethod === 'operacao' ? 'saldo_operacao' : 'commission_balance';
    if (paymentMethod === 'saldo' || paymentMethod === 'operacao') {
      const nomeSaldo = paymentMethod === 'operacao' ? 'Saldo de operação' : 'Saldo de comissão';
      const wArr = await (await sb(`app_users?select=id,${colSaldo}&id=eq.${encodeURIComponent(walletOwnerId)}&limit=1`)).json();
      const saldoAtual = round2(Array.isArray(wArr) && wArr[0] ? wArr[0][colSaldo] : 0);
      if (saldoAtual < total) {
        return res.status(200).json({ success: false, error: `${nomeSaldo} insuficiente. Disponível: R$ ${saldoAtual.toFixed(2)} · Pedido: R$ ${total.toFixed(2)}. Faltam R$ ${(total - saldoAtual).toFixed(2)} — deposite saldo para fechar o pedido.`, saldo: saldoAtual });
      }
      const deb = await sb(`app_users?id=eq.${encodeURIComponent(walletOwnerId)}&${colSaldo}=gte.${total}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ [colSaldo]: round2(saldoAtual - total) }),
      });
      const debOk = deb.ok ? await deb.json() : null;
      if (!Array.isArray(debOk) || !debOk.length) {
        return res.status(200).json({ success: false, error: 'Não foi possível debitar o saldo. Tente novamente.' });
      }
      saldoRestante = round2(debOk[0][colSaldo]);
    }

    // insere a venda (tenta com campos extras; se coluna não existir, cai pro mínimo)
    let r = await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(sale) });
    if (!r.ok) {
      const minimal = { id: saleId, base44_id: saleId, kind: 'produto', seller_id: sellerId, buyer_name: sale.buyer_name, product_title: sale.product_title, sale_price: total, total_amount: total, quantity: totalQty, status: sale.status, payment_method: paymentMethod };
      r = await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(minimal) });
      if (!r.ok) {
        // venda não gravou → devolve o saldo debitado (nada de dinheiro sumido)
        if (saldoRestante != null) {
          // devolve na MESMA carteira que foi debitada — nada de dinheiro trocando de bolso
          await sb(`app_users?id=eq.${encodeURIComponent(walletOwnerId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ [colSaldo]: round2(saldoRestante + total) }) });
        }
        const t = await r.text(); return res.status(200).json({ success: false, error: 'Falha ao gravar venda', details: t.slice(0, 200) });
      }
    }

    // 📦 baixa pela REGRA ÚNICA (api/_lib/baixaEstoque.js): o estoque PRÓPRIO do balcão
    // (comprado → consignado) sai primeiro; o que faltar sai do estoque central.
    const donoEstoque = isStoreOwner ? actorId : sellerId;
    const { consumos } = await baixarItensDaVenda({ ownerId: donoEstoque, items: itemsJson });

    // 🤝 peça consignada vendida: a dívida dela morre AGORA (débito no saldo, já
    // conferido pela trava acima — nunca deixa saldo negativo nem dívida sobrando)
    let consignadoQuitado = 0;
    if (consumos.some((c) => c.origem === 'consignado')) {
      try {
        const lq = await liquidarConsignado({ sale: { ...sale, id: saleId }, ownerId: donoEstoque, consumos, paymentMethod });
        consignadoQuitado = lq?.total || 0;
      } catch (e) {
        console.error(`[PDV] Liquidação de consignado falhou na venda ${saleId}:`, e?.message);
      }
    }

    // 💰 COMISSÃO da venda física.
    let comissao = 0; let rateio = null; let comissaoErro = null;
    try {
      if (comprador) {
        // 🏪 LICENÇA IDENTIFICADA: comprador recebe o % da licença dele no escritório virtual
        // e o balcão fica com o restante do teto — independente da linha/estrutura do comprador.
        const balcao = await buscarUsuario(sellerId);
        rateio = await pagarComissaoBalcao({
          saleId, produtoTitulo: sale.product_title, base: totalBruto,
          comprador, balcao, levels: tabelas.levels,
        });
        comissao = rateio?.total ?? 0;
      } else {
        const rr = await fulfillStoreOrder({
          ...sale,
          seller_id: vendedor?.id || sellerId,
          items_json: itemsJson,
          skipStock: true, // o estoque já foi baixado acima, item a item
        });
        comissao = rr?.commission ?? 0;
      }
      if (comissao > 0) await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_total: comissao }) });
    } catch (e) {
      // ⚠️ não engolir: a venda vale, mas a comissão precisa ser vista e reprocessada.
      comissaoErro = String(e?.message || e).slice(0, 200);
      console.error(`[PDV] COMISSÃO FALHOU na venda ${saleId} (venda gravada, comissão pendente):`, comissaoErro);
    }

    // 💸 mercadoria que era do balcão: custo destravado + margem voltam pra conta dele
    if (consumos.length) {
      try {
        await liberarRepasseEstoqueProprio({ sale: { ...sale, total_amount: total }, ownerId: donoEstoque, consumos, comissaoTotal: comissao });
      } catch (e) {
        console.error(`[PDV] Repasse de estoque próprio falhou na venda ${saleId}:`, e?.message);
      }
    }

    return res.status(200).json({ success: true, sale_id: saleId, total, total_bruto: totalBruto, comissao_licenca: comissaoInfo, saldo_restante: saldoRestante, rateio, items: lines.length, status: sale.status, vendedor: vendedor?.full_name || comprador?.full_name || null, comissao, comissao_erro: comissaoErro, comissoes_pendentes: rateio?.pendentes || 0, consignado_quitado: consignadoQuitado });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao tirar pedido', details: String(e?.message || e) });
  }
}