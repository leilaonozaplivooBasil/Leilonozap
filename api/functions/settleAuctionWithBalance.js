// settleAuctionWithBalance — liquida o arremate AUTOMATICAMENTE com o saldo da carteira.
// Chamado quando o modal de vitória abre: consome o saldo_reservado do vencedor
// (e só busca o saldo_disponivel se faltar), cria a venda já paga (kind 'arremate')
// e paga comissões — sem passar pelo checkout.
// Idempotente: flip atômico do order_status da auction garante execução única.
import { oid } from '../_lib/oid.js';
import { fulfillStoreOrder } from '../_lib/storeFulfill.js';

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


// ══════════════════════════════════════════════════════════════════════════════
// 🚚 O PACOTE DE ENTREGA DO ARREMATE — corrigido em 21/08/2026
// ══════════════════════════════════════════════════════════════════════════════
// COMO ESTAVA, e os quatro defeitos numa linha só:
//
//   ...(freteAmount > 0 ? { raw_base44: { frete: { valor: freteAmount }, amount_charged: amount } } : {})
//
//   ① `delivery_type` NUNCA era gravado. E as duas pontas discordam do valor
//      ausente: CatalogOrdersAdmin.jsx só esconde a etiqueta quando é 'pickup',
//      melhorEnvioShipment.js só aceita quando é 'delivery'. Resultado: a tela
//      mostrava "Etiqueta pendente" e o servidor respondia "é retirada no
//      balcão". Acontecia em TODO arremate, não em alguns.
//   ② Com frete zero, o `raw_base44` inteiro deixava de existir — sem frete,
//      sem amount_charged, sem nada. Foi o caso do pedido ARD5856D19.
//   ③ O frete ia como `{ valor }` só. melhorEnvioShipment.js exige `frete.id`
//      (o serviço escolhido) ou devolve 'sem_frete_id'. Ou seja: mesmo o
//      arremate COM frete jamais geraria etiqueta. E sem `empresa`/`servico`,
//      a tela mostrava "Frete: R$ 11,60" sem nome de transportadora.
//   ④ Nenhum endereço de entrega era gravado. A Melhor Envio precisa dele.
//
// COMO FICOU: o raw_base44 nasce SEMPRE, com delivery_type, endereço do
// vencedor e o frete completo.
//
// ⚠️ POR QUE O DETALHE DO FRETE É RESOLVIDO AQUI, E NÃO NO LANCE
// O caminho óbvio seria o lance já gravar id/empresa/serviço. Não dá: o PATCH
// do lance (submitAtomicBid.js) não aceita campo que não exista na tabela —
// coluna inexistente ali faz o PostgREST devolver 42703 e TODO lance morre.
// Foi o que derrubou a produção de 03/08 15:03 até o PONTO 83, e está anotado
// no cabeçalho daquele arquivo. Então aqui a gente RECOTA o frete com o CEP do
// vencedor só para descobrir o `id` do serviço.
//
// ⚠️ O VALOR COBRADO NÃO MUDA. Quem manda é `frete_reservado_valor`, que foi o
// que o cliente viu e teve reservado no lance. A recotação serve só para achar
// o id/empresa/serviço da etiqueta. Se ela falhar, o pedido nasce com o valor
// certo e sem id — vira etiqueta pendente, que é um problema de logística, não
// de dinheiro.
async function montarRawArremate({ user, freteAmount, amount, produtoAmount, auction }) {
  const cep = String(user?.address_zip_code || '').replace(/\D/g, '');
  const endereco = {
    street: user?.address_street || null,
    number: user?.address_number || null,
    complement: user?.address_complement || null,
    neighborhood: user?.address_neighborhood || null,
    city: user?.address_city || null,
    state: user?.address_state || null,
    zip: cep || null,
  };
  const temEndereco = !!(endereco.street && cep.length === 8);

  // ⚠️ F9 — NUNCA transformar entrega paga em retirada.
  // A primeira versão marcava 'pickup' quando faltava endereço, MESMO com frete
  // cobrado. Isso é apagar um problema com outro: o cliente pagou frete, então
  // aquilo é entrega. Sem endereço vira 'delivery_pendente' — pendência
  // operacional visível, que a logística resolve pedindo o endereço.
  const situacao = freteAmount > 0
    ? (temEndereco ? 'delivery' : 'delivery_pendente')
    : (temEndereco ? 'delivery' : 'pickup');

  const raw = {
    delivery_type: situacao,
    address: temEndereco ? endereco : null,
    amount_charged: amount,
    produto_amount: produtoAmount,
    origem: 'settleAuctionWithBalance',
    frete: { id: null, valor: freteAmount, empresa: null, servico: null, prazo: null, cep: cep || null },
  };

  if (situacao === 'delivery_pendente') {
    raw.pendencia = 'Frete cobrado mas o comprador está sem endereço completo no cadastro. Peça o endereço antes de despachar.';
  }
  if (!(temEndereco && freteAmount > 0)) return raw;

  // recotação só para descobrir o serviço — nunca para mudar o valor.
  // ⚠️ F8 — o produto é `auction.product_id`. A primeira versão passava o id do
  // LEILÃO, que não existe em `public.products`: `cotarOpcoes` não achava nada e
  // caía silenciosamente na caixa mínima dos Correios (11×2×16 cm, 0,3 kg). Ou
  // seja, escolhia transportadora e preço por um pacote fictício. Achado da
  // auditoria independente da OpenAI, e o erro era meu.
  try {
    const { cotarFreteDoLeilao } = await import('../_lib/freteLeilao.js');
    const r = await cotarFreteDoLeilao({ auctionId: auction.id, userId: user.id, auction, cep });
    if (r?.ok && Array.isArray(r.opcoes) && r.opcoes.length) {
      const escolhida = r.opcoes.reduce((melhor, o) =>
        Math.abs(o.preco - freteAmount) < Math.abs(melhor.preco - freteAmount) ? o : melhor, r.opcoes[0]);
      raw.frete.id = String(escolhida.id);
      raw.frete.empresa = escolhida.empresa || null;
      raw.frete.servico = escolhida.nome || null;
      raw.frete.prazo = escolhida.prazo ?? null;
      raw.frete.valor_recotado = escolhida.preco;   // trilha: dá pra comparar depois
    } else if (r?.motivo) {
      raw.frete.recotacao_falhou = r.motivo;        // a logística vê por que não saiu etiqueta
    }
  } catch (e) {
    console.warn('[SETTLE] recotacao de frete falhou (pedido segue com o valor reservado):', e?.message);
    raw.frete.recotacao_falhou = String(e?.message || e).slice(0, 120);
  }
  return raw;
}

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

    const aRows = await (await sb(`auctions?select=id,title,current_price,winner_id,winner_name,status,order_status,image_urls,frete_reservado_valor&id=eq.${encodeURIComponent(auctionId)}&limit=1`)).json();
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
    const rawArremate = await montarRawArremate({ user: { ...user, id: userId }, freteAmount, amount, produtoAmount, auction });
    const saleId = oid();
    const sale = {
      id: saleId, base44_id: saleId, kind: 'arremate',
      buyer_id: userId, buyer_email: user.email || '', buyer_name: user.full_name || auction.winner_name || 'Vencedor',
      buyer_phone: user.phone || null, buyer_cpf: user.cpf || null,
      product_title: `Arremate — ${auction.title}`.slice(0, 200),
      product_image: auction.image_urls?.[0] || null,
      // total_amount é a base da comissão — fica só com o produto, frete nunca comissiona.
      sale_price: produtoAmount, total_amount: produtoAmount, quantity: 1,
      status: 'paid', payment_method: 'saldo',
      tracking_code: 'AR' + saleId.slice(0, 8).toUpperCase(),
      created_date: new Date().toISOString(),
      // 🚚 raw_base44 do arremate — ver montarRawArremate() logo acima do handler.
      raw_base44: rawArremate,
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

    return res.status(200).json({ success: true, paid: true, sale_id: saleId, amount, produto_amount: produtoAmount, frete_amount: freteAmount, new_balance: newBalance, commission });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}