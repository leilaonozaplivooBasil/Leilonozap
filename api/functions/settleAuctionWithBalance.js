// settleAuctionWithBalance — liquida o arremate AUTOMATICAMENTE com o saldo da carteira.
// Chamado quando o modal de vitória abre: consome o saldo_reservado do vencedor
// (e só busca o saldo_disponivel se faltar), cria a venda já paga (kind 'arremate')
// e paga comissões — sem passar pelo checkout.
// Idempotente: flip atômico do order_status da auction garante execução única.
import { oid } from '../_lib/oid.js';
import { fulfillStoreOrder } from '../_lib/storeFulfill.js';
import { gerarEnvioAutomatico } from '../_lib/melhorEnvioShipment.js';
import { montarRawArremate } from '../_lib/rawArremate.js';
import { registrarReceita } from '../_lib/financialIncome.js';

import { exigirSessao } from '../_lib/sessao.js';
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


// 🚚 O pacote de entrega do arremate (delivery_type, endereço, frete completo)
// mora em api/_lib/rawArremate.js — compartilhado com o arremate pago por
// PIX/cartão, que nasce em createMPWalletDeposit.js. Ver o cabeçalho de lá.

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const auctionId = String(body?.auction_id || '').trim();
    const userId = String(body?.user_id || '').trim();
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, userId, 'settleAuctionWithBalance');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    if (!auctionId || !userId) return res.status(400).json({ success: false, error: 'Dados obrigatórios ausentes' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const aRows = await (await sb(`auctions?select=id,title,current_price,winner_id,winner_name,status,order_status,image_urls,frete_reservado_valor,product_id&id=eq.${encodeURIComponent(auctionId)}&limit=1`)).json();
    const auction = Array.isArray(aRows) ? aRows[0] : null;
    if (!auction) return res.status(200).json({ success: false, error: 'Leilão não encontrado' });
    if (auction.winner_id !== userId) return res.status(200).json({ success: false, error: 'Usuário não é o vencedor' });
    if (auction.order_status === 'paid') return res.status(200).json({ success: true, already_paid: true });

    // 🚚 Frete calculado na sala é cobrado junto do produto — mas NUNCA entra na
    // base de comissão (total_amount da venda continua só o valor do produto).
    const produtoCents = cents(auction.current_price);
    const freteCents = cents(auction.frete_reservado_valor || 0);
    const amountCents = produtoCents + freteCents;
    if (amountCents <= 0) return res.status(200).json({ success: false, error: 'Valor inválido' });
    const amount = fromCents(amountCents);
    const produtoAmount = fromCents(produtoCents);
    const freteAmount = fromCents(freteCents);

    // 🔴 CORREÇÃO 18/08/2026 — COBRANÇA DUPLA DO VENCEDOR (autorizada pelo dono).
    //
    // O QUE ESTAVA ERRADO: este endpoint cobrava o arremate SÓ do saldo_disponivel.
    // Mas o dinheiro do vencedor está no saldo_RESERVADO — foi travado ali no lance.
    // Consequências reais medidas na auditoria:
    //   • Quem tinha disponível pagava DUAS VEZES na prática: saía do disponível e o
    //     reservado ficava travado pra sempre (caso Sophia R$ 15,60 / Luiz R$ 21,60).
    //   • Quem NÃO tinha disponível recebia "saldo insuficiente" mesmo com o dinheiro
    //     dele reservado na própria conta.
    //
    // REGRA OFICIAL AGORA: o arremate consome PRIMEIRO o saldo_reservado (que já é
    // dele, travado pra este fim) e só busca o saldo_disponivel se faltar.
    // A conferência de suficiência passa a ser sobre reservado + disponível.
    const uRows = await (await sb(`app_users?select=saldo_disponivel,saldo_reservado,full_name,email,cpf,phone,address_street,address_number,address_complement,address_neighborhood,address_city,address_state,address_zip_code&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
    const user = Array.isArray(uRows) ? uRows[0] : null;
    if (!user) return res.status(200).json({ success: false, error: 'Usuário não encontrado' });
    const totalDisponivelCents = cents(user.saldo_disponivel) + cents(user.saldo_reservado);
    if (totalDisponivelCents < amountCents) {
      return res.status(200).json({
        success: false, insufficient: true,
        error: 'Saldo insuficiente',
        balance: fromCents(cents(user.saldo_disponivel)),
        reserved: fromCents(cents(user.saldo_reservado)),
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

    // 💰 DÉBITO ATÔMICO (CAS) EM CENTAVOS — RESERVADO PRIMEIRO, DEPOIS DISPONÍVEL.
    // A trava otimista agora vale para AS DUAS colunas: só grava se nenhuma delas
    // mudou entre a leitura e a escrita. Se mudou (outro lance/depósito em paralelo),
    // relê e tenta de novo. Assim o arremate nunca solta reserva de outro leilão.
    let newBalance = null;
    let baixaReservado = 0; // centavos consumidos do saldo_reservado (pro livro-caixa)
    let reservadoAntes = 0;
    let reservadoDepois = 0;
    for (let attempt = 0; attempt < 5; attempt++) {
      const rows = await (await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();
      const u = Array.isArray(rows) ? rows[0] : null;
      const curDisp = cents(u?.saldo_disponivel);
      const curRes = cents(u?.saldo_reservado);
      if (curDisp + curRes < amountCents) {
        // saldo caiu no meio do caminho — desfaz o flip e devolve o CTA de pagamento
        await sb(`auctions?id=eq.${encodeURIComponent(auctionId)}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ order_status: 'awaiting_payment' }),
        });
        return res.status(200).json({ success: false, insufficient: true, error: 'Saldo insuficiente', balance: fromCents(curDisp), reserved: fromCents(curRes), needed: amount });
      }
      // consome a reserva primeiro; o que faltar sai do disponível
      const tirarDaReserva = Math.min(curRes, amountCents);
      const tirarDoDisponivel = amountCents - tirarDaReserva;
      const novoDisp = fromCents(curDisp - tirarDoDisponivel);
      const novoRes = fromCents(curRes - tirarDaReserva);
      // coluna nunca inicializada fica NULL, e "eq.0" nunca casa com NULL
      const fDisp = curDisp === 0 ? 'or(saldo_disponivel.eq.0,saldo_disponivel.is.null)' : `saldo_disponivel.eq.${fromCents(curDisp)}`;
      const fRes = curRes === 0 ? 'or(saldo_reservado.eq.0,saldo_reservado.is.null)' : `saldo_reservado.eq.${fromCents(curRes)}`;
      const patch = await sb(
        `app_users?id=eq.${encodeURIComponent(userId)}&and=(${fDisp},${fRes})`,
        { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ saldo_disponivel: novoDisp, saldo_reservado: novoRes }) }
      );
      const updated = await patch.json().catch(() => []);
      if (Array.isArray(updated) && updated.length) {
        newBalance = novoDisp;
        baixaReservado = tirarDaReserva;
        reservadoAntes = curRes;
        reservadoDepois = curRes - tirarDaReserva;
        break;
      }
      // corrida: alguém mudou o saldo — relê e tenta de novo
    }
    if (newBalance === null) {
      await sb(`auctions?id=eq.${encodeURIComponent(auctionId)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ order_status: 'awaiting_payment' }),
      });
      return res.status(200).json({ success: false, error: 'Concorrência ao debitar, tente novamente' });
    }

    // 📒 LIVRO-CAIXA DA RESERVA (reserva_ledger) — registra a baixa do saldo_reservado
    // que virou pagamento do arremate, com saldo antes e depois. Best-effort inline:
    // falha aqui NUNCA derruba a liquidação (a venda já está paga neste ponto).
    // ⚠️ Import de 2 níveis já derrubou o lance em produção — por isso inline, sem import.
    if (baixaReservado > 0) {
      try {
        await sb('reserva_ledger', {
          method: 'POST', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            user_id: userId,
            auction_id: auctionId,
            tipo: 'liquidacao_arremate',
            direcao: 'saida_reserva',
            valor: fromCents(baixaReservado),
            saldo_antes: fromCents(reservadoAntes),
            saldo_depois: fromCents(reservadoDepois),
            origem: 'settleAuctionWithBalance',
          }),
        });
      } catch (e) { console.warn('[SETTLE] livro-caixa da reserva:', e?.message); }
    }

    // venda já paga (mesma rota do arremate via PIX, sem gateway)
    const rawArremate = await montarRawArremate({ user: { ...user, id: userId }, freteAmount, amount, produtoAmount, auction, origem: 'settleAuctionWithBalance' });
    const saleId = oid();
    const sale = {
      id: saleId, base44_id: saleId, kind: 'arremate',
      buyer_id: userId, buyer_email: user.email || '', buyer_name: user.full_name || auction.winner_name || 'Vencedor',
      buyer_phone: user.phone || null, buyer_cpf: user.cpf || null,
      product_title: `Arremate — ${auction.title}`.slice(0, 200),
      product_image: auction.image_urls?.[0] || null,
      // 🔴 24/08/2026 — SEM ISTO O ARREMATE NUNCA BAIXAVA O ESTOQUE.
      // fulfillStoreOrder (storeFulfill.js:196) monta a lista de itens assim:
      //     if (!items.length && sale.product_id) { ... }
      // O comentário lá em cima diz, com todas as letras, "venda de item único
      // (checkout direto / ARREMATE) não tem items_json — usa o product_id da
      // venda". Só que o arremate nunca gravava esse campo: a venda nascia sem
      // product_id, a condição dava falso, `items` ficava vazio e
      // baixarItensDaVenda NEM ERA CHAMADO.
      //
      // Resultado na loja: peça arrematada continuava à venda, com o estoque
      // intacto. Foi o caso da "panela pressao eletrica mini" — arrematada às
      // 08:16 e ainda aparecendo na vitrine com Estoque: 1.
      //
      // A coluna auctions.product_id sempre existiu; faltava trazer no select
      // (feito logo acima) e gravar aqui.
      product_id: auction.product_id || null,
      // total_amount é a base da comissão — fica só com o produto, frete nunca comissiona.
      sale_price: produtoAmount, total_amount: produtoAmount, quantity: 1,
      status: 'paid', payment_method: 'saldo',
      tracking_code: 'AR' + saleId.slice(0, 8).toUpperCase(),
      created_date: new Date().toISOString(),
      // 🚚 raw_base44 do arremate — ver montarRawArremate() logo acima do handler.
      raw_base44: rawArremate,
    };
    // 🔴 24/08/2026 — ESTA GRAVAÇÃO FALHAVA CALADA, E FOI CARO.
    //
    // Era só `await sb(...)`, sem olhar a resposta. O PostgREST recusava o insert
    // (a coluna buyer_cpf não existia na tabela — ver a migração 20260824), a
    // função seguia em frente como se tivesse dado certo, e o resultado era o
    // pior estado possível:
    //   • o leilão marcado como 'paid'
    //   • o saldo do cliente DEBITADO (com linha no reserva_ledger)
    //   • e NENHUM pedido em catalog_sales
    // O cliente pagou, a logística nunca viu, e ninguém foi avisado. Aconteceu com
    // 4 clientes de uma vez (R$ 37,40) na primeira execução do cron de liquidação.
    //
    // Agora a resposta é conferida. Se a venda não nascer, o erro sobe: o dinheiro
    // já saiu neste ponto, então o mínimo é NÃO fingir sucesso — quem chamou fica
    // sabendo, e o motivo real do banco vai pro log.
    const vendaResp = await sb('catalog_sales', {
      method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(sale),
    });
    if (!vendaResp.ok) {
      const detalhe = await vendaResp.text().catch(() => '');
      console.error(
        `[SETTLE] venda ${saleId} do leilão ${auctionId} NÃO foi gravada — HTTP ${vendaResp.status}:`,
        detalhe.slice(0, 500)
      );
      return res.status(200).json({
        success: false,
        error: 'venda_nao_gravada',
        detalhe: detalhe.slice(0, 300),
        // Sinaliza o estado exato para quem for consertar: já debitou, falta o pedido.
        saldo_ja_debitado: true, sale_id: saleId, auction_id: auctionId, amount,
      });
    }

    // comissões — mesma regra do webhook para arremate
    let commission = 0;
    try {
      const rr = await fulfillStoreOrder(sale);
      commission = rr?.commission ?? 0;
      await sb(`catalog_sales?id=eq.${saleId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ commission_total: commission }) });
      // 💰 DIR-7 — só a comissão é receita da empresa; o resto do saldo debitado do
      // vencedor (produtoAmount) é repassado ao vendedor, não fica com a plataforma.
      await registrarReceita({ description: `Comissão — arremate #${saleId}`, category: 'comissao_leilao', costCenter: 'Leilões', amount: commission, source: 'venda', saleId });
    } catch (e) {
      console.warn('settle: comissão falhou (venda segue paga):', e?.message);
    }

    // 🚚 ETIQUETA (22/08/2026) — esta rota criava a venda e parava aqui. O arremate
    // pago com SALDO era o único caminho de venda que nunca disparava a etiqueta: a
    // loja dispara pelo mpWebhook, o arremate por PIX/cartão também, e este não.
    // O operador só descobria na hora de despachar e tinha que gerar no botão manual,
    // pedido por pedido.
    //
    // `montarRawArremate` (acima) já monta delivery_type, endereço e frete.id — os
    // dados que a etiqueta precisa já estavam prontos, só faltava a chamada.
    //
    // Best-effort, igual ao mpWebhook: `gerarEnvioAutomatico` nunca lança (devolve
    // {ok:false, skipped}) e o resultado vai no corpo da resposta. Venda e comissão
    // já aconteceram acima e não dependem disto.
    const envio = await gerarEnvioAutomatico(sale);

    return res.status(200).json({ success: true, paid: true, sale_id: saleId, amount, produto_amount: produtoAmount, frete_amount: freteAmount, new_balance: newBalance, commission, envio });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}