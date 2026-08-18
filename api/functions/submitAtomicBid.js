// [RESYNC 2026-08-01] Forçando este arquivo a entrar no próximo commit/deploy da Vercel —
// ele não aparecia na lista de Functions do último deploy (sync Base44→GitHub perdido).
// submitAtomicBid — confirma o lance no leilão com TRAVA OTIMISTA real (CAS por version).
// Espelho fiel de base44/functions/submitAtomicBid/entry.ts, que NÃO roda na Vercel.
// Sem este endpoint a produção sempre caía em "Erro ao enviar lance." DEPOIS de o saldo
// já ter sido reservado por reserveBidBalance (o adapter devolve not_implemented no 404).
// Diferença obrigatória: não existe auth.me() aqui — a identidade vem do BODY (user_id).
//
// 🩹 CAUSA-RAIZ investigada: este era o ÚNICO endpoint de lance com import relativo de
// 2 níveis (../_lib/bidHold.js → ./passaporteCoupon.js). Os demais (reserveBidBalance,
// releaseBidHold) são 100% autocontidos e sempre funcionaram. Pra eliminar qualquer
// dúvida de resolução de módulo no bundling da Vercel, a devolução de reserva do líder
// anterior (releaseHold) foi trazida pra DENTRO deste arquivo — zero imports relativos.

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

const COUNTDOWN_DURATION = 142; // 2min22s
const BID_EXTENSION_SECONDS = 22;
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

async function sb(path, method = 'GET', body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

// 🔄 REGRA OFICIAL CORRIGIDA (08/08/2026, pelo dono):
// Ser coberto DEVOLVE o dinheiro na hora — para a pessoa poder relançar. O que
// NÃO acontece é esse dinheiro virar saldo de compra da Loja Virtual: ele fica
// comprometido até o leilão encerrar. Esse bloqueio para a loja NÃO é feito aqui
// (nem por coluna): é calculado a partir dos lances vivos em _lib/compromissoLeilao.js
// e aplicado no checkout da loja. Assim o lance nunca trava e a loja nunca gasta
// dinheiro que ainda está em disputa.
//
// Devolve saldo_reservado → saldo_disponivel do líder ANTERIOR, com trava otimista
// (só grava se os dois saldos estiverem como foram lidos). Nunca devolve mais do que
// está reservado e nunca derruba o lance: falha aqui é registrada e seguimos.
async function releaseHold(userId, valor) {
  const uid = String(userId || '').trim();
  const pedido = money(valor);
  if (!uid || pedido <= 0) return 0;
  try {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const r = await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${encodeURIComponent(uid)}&limit=1`);
      const u = Array.isArray(r.data) ? r.data[0] : null;
      if (!u) return 0;
      const disponivel = money(u.saldo_disponivel);
      const reservado = money(u.saldo_reservado);
      const liberar = money(Math.min(pedido, reservado));
      if (liberar <= 0) return 0;
      // coluna nunca inicializada fica NULL, e "eq.0" jamais casa com NULL
      const fDisp = disponivel === 0 ? 'or(saldo_disponivel.eq.0,saldo_disponivel.is.null)' : `saldo_disponivel.eq.${disponivel}`;
      const fRes = reservado === 0 ? 'or(saldo_reservado.eq.0,saldo_reservado.is.null)' : `saldo_reservado.eq.${reservado}`;
      const patch = await sb(`app_users?id=eq.${encodeURIComponent(uid)}&and=(${fDisp},${fRes})`, 'PATCH', {
        saldo_disponivel: money(disponivel + liberar),
        saldo_reservado: money(reservado - liberar),
      });
      if (Array.isArray(patch.data) && patch.data[0]) return liberar;
      // corrida: o saldo mudou entre a leitura e a escrita — tenta de novo
    }
    return 0;
  } catch (e) {
    console.warn('[BID] releaseHold:', e?.message);
    return 0;
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

    const auctionId = String(body?.auction_id || '').trim();
    const bidAmount = parseFloat(body?.amount);
    const userId = String(body?.user_id || '').trim();
    const bidderName = body?.bidder_name;
    // 🚚 Frete calculado uma vez na sala e somado ao lance na reserva de saldo.
    const freteValor = Math.max(0, parseFloat(body?.frete_valor) || 0);

    if (!auctionId || !bidAmount || bidAmount <= 0 || !userId) {
      return res.status(400).json({ success: false, message: 'Parâmetros inválidos' });
    }
    if (!SUPABASE_URL || !SR) {
      return res.status(500).json({ success: false, message: 'Config do servidor ausente' });
    }

    // Identidade: valida que o usuário existe (substitui o auth.me() do Base44)
    const userResp = await sb(`app_users?select=id,full_name,nickname,saldo_disponivel,saldo_reservado&id=eq.${encodeURIComponent(userId)}&limit=1`);
    const user = Array.isArray(userResp.data) ? userResp.data[0] : null;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Não autorizado' });
    }

    const getResp = await sb(
      `auctions?id=eq.${encodeURIComponent(auctionId)}&select=id,current_price,starting_price,increment,status,end_time,version,winner_id,winner_name,modo_chamada,data_abertura_lances,frete_reservado_valor`
    );
    const auction = Array.isArray(getResp.data) ? getResp.data[0] : null;

    if (!getResp.ok || !auction) {
      // 🩹 DIAGNÓSTICO: expõe o erro real do Supabase quando a busca falha (ex: formato de
      // id inválido para a coluna) em vez de só dizer "não encontrado" sem motivo real.
      return res.status(404).json({
        success: false,
        message: getResp.ok ? 'Leilão não encontrado' : 'Erro ao buscar leilão',
        debug: !getResp.ok ? getResp.data : { auctionId },
      });
    }

    // 📣 PONTO 69 — MODO CHAMADA: leilão visível mas ainda fechado para lances.
    // Guarda ANTES de qualquer escrita/valor — nada de saldo é tocado aqui.
    if (auction.modo_chamada && auction.data_abertura_lances) {
      const abertura = new Date(auction.data_abertura_lances).getTime();
      if (Number.isFinite(abertura) && Date.now() < abertura) {
        return res.status(400).json({
          success: false,
          message: 'Leilão ainda não aberto para lances',
          modo_chamada: true,
          data_abertura_lances: auction.data_abertura_lances,
        });
      }
    }

    if (auction.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Leilão não está ativo',
        current_state: { current_price: auction.current_price, status: auction.status, winner_name: auction.winner_name },
      });
    }

    const now = Date.now();
    const endTime = new Date(auction.end_time).getTime();
    if (now >= endTime) {
      return res.status(400).json({
        success: false,
        message: 'Leilão já encerrou',
        current_state: { current_price: auction.current_price, status: auction.status, end_time: auction.end_time },
      });
    }

    // 🩹 CORREÇÃO (validado 02/08): quando NENHUM lance foi dado ainda (winner_id vazio),
    // o primeiro lance vale o starting_price publicado — o incremento só entra a partir
    // do SEGUNDO lance em diante. Antes disso, current_price nasce igual a starting_price
    // e o motor já exigia +incremento até no primeiro lance, bloqueando o valor anunciado.
    const isFirstBid = !auction.winner_id;
    const currentPrice = Number(auction.current_price || auction.starting_price);
    const minBid = isFirstBid ? Number(auction.starting_price) : currentPrice + Number(auction.increment);

    if (!isFirstBid && bidAmount <= currentPrice) {
      return res.status(409).json({
        success: false,
        message: `Lance deve ser maior que R$ ${currentPrice.toFixed(2)}`,
        conflict: true,
        current_state: { current_price: currentPrice, min_bid: minBid, winner_name: auction.winner_name },
      });
    }

    // 🎯 PONTO 85 — o PRIMEIRO lance precisa ser EXATAMENTE o preço inicial anunciado
    // (antes bastava ser "maior ou igual", o que deixava passar qualquer valor acima
    // do inicial sem respeitar o incremento, ex: inicial R$197 + incremento R$50
    // aceitando um primeiro lance de R$198). Do segundo lance em diante a regra de
    // incremento normal (current_price + increment) continua intacta, abaixo.
    if (isFirstBid && money(bidAmount) !== money(minBid)) {
      return res.status(400).json({
        success: false,
        message: `O primeiro lance precisa ser exatamente R$ ${minBid.toFixed(2)}`,
        current_state: { current_price: currentPrice, min_bid: minBid, winner_name: auction.winner_name },
      });
    }

    if (!isFirstBid && bidAmount < minBid) {
      return res.status(400).json({
        success: false,
        message: `Lance mínimo: R$ ${minBid.toFixed(2)}`,
        current_state: { current_price: currentPrice, min_bid: minBid, winner_name: auction.winner_name },
      });
    }

    // 💰 TRAVA DE DINHEIRO NO SERVIDOR (08/08/2026, pedido do dono).
    // Antes, o servidor CONFIAVA que o navegador já tinha reservado o saldo: se a reserva
    // falhasse, fosse pulada, ou a função fosse chamada direto, o lance entrava sem dinheiro
    // — foi assim que uma conta ficou liderando R$ 119,80 tendo só R$ 100,00 (o frete de cada
    // lance nunca chegou a ser cobrado). Agora a conta é fechada AQUI, antes de gravar
    // qualquer coisa: tudo o que a pessoa tem (livre + reservado) precisa cobrir a soma de
    // TODOS os lances em que ela está na frente, com o frete de cada um, incluindo este.
    // Nada de saldo é movido aqui — quem reserva continua sendo o reserveBidBalance.
    const dinheiroTotal = money(Number(user.saldo_disponivel || 0) + Number(user.saldo_reservado || 0));
    const lideraResp = await sb(
      `auctions?select=id,current_price,frete_reservado_valor&status=eq.active&winner_id=eq.${encodeURIComponent(userId)}`
    );
    const lidera = Array.isArray(lideraResp.data) ? lideraResp.data : [];
    // o leilão atual entra pelo valor NOVO (este lance), não pelo antigo
    const jaComprometido = lidera
      .filter((a) => String(a.id) !== auctionId)
      .reduce((s, a) => money(s + money(a.current_price) + money(a.frete_reservado_valor)), 0);
    const precisaTer = money(jaComprometido + money(bidAmount) + money(freteValor));

    if (precisaTer > dinheiroTotal) {
      const falta = money(precisaTer - dinheiroTotal);
      return res.status(200).json({
        success: false,
        saldo_insuficiente: true,
        message: freteValor > 0
          ? `Saldo insuficiente. Este lance é R$ ${money(bidAmount).toFixed(2).replace('.', ',')} + R$ ${money(freteValor).toFixed(2).replace('.', ',')} de frete. Faltam R$ ${falta.toFixed(2).replace('.', ',')}.`
          : `Saldo insuficiente. Faltam R$ ${falta.toFixed(2).replace('.', ',')}.`,
        required: precisaTer,
        balance: dinheiroTotal,
        deficit: falta,
      });
    }

    const timeUntilEnd = Math.floor((endTime - now) / 1000);
    let newEndTime = auction.end_time;
    if (timeUntilEnd <= COUNTDOWN_DURATION) {
      newEndTime = new Date(endTime + BID_EXTENSION_SECONDS * 1000).toISOString();
    }

    const currentVersion = auction.version || 0;
    const winnerName = bidderName || user.nickname || user.full_name || 'Anônimo';

    // ⚠️ CAUSA-RAIZ DO "Erro ao enviar lance": leilões gerados a partir de lotes nascem com
    // version = NULL. Em SQL, NULL nunca casa com "version=eq.0" — o PATCH atingia ZERO linhas
    // e todo lance virava falso conflito. Quando version é NULL, a trava usa "version=is.null".
    const versionFilter =
      auction.version === null || auction.version === undefined
        ? 'version=is.null'
        : `version=eq.${currentVersion}`;

    // 🔴 PONTO 72 — ORDEM CORRIGIDA: o REGISTRO DO LANCE nasce ANTES do preço.
    // Antes, o preço era gravado aqui e o registro do lance só era criado depois, pelo
    // NAVEGADOR do usuário. Se aquela criação falhasse (rede/RLS), o dinheiro era
    // estornado mas o preço já tinha subido — o leilão ficava com preço inflado e um
    // "vencedor" sem saldo reservado. Agora: grava o lance, e só então o preço.
    const bidInsertResp = await sb('auction_messages', 'POST', {
      auction_id: auctionId,
      message_type: 'bid',
      sender_id: userId,
      sender_name: winnerName,
      bid_amount: bidAmount,
      // 🕐 PONTO 84 — DATA OBRIGATÓRIA NO LANCE. Estas colunas NÃO têm preenchimento
      // automático no banco (quem preenchia era o adapter, que saiu do caminho no
      // PONTO 72). Sem elas o lance nascia com data NULA, e o extrato da carteira,
      // que ordena por data, jogava o lance para o fim da lista — o usuário dava o
      // lance e não o encontrava. Ambas as colunas foram confirmadas por leitura no
      // banco antes desta alteração (created_date existe; timestamp existe).
      created_date: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      // 🚚 PONTO 84 (camada 2) — FRETE RESERVADO NESTE LANCE.
      // A coluna auction_messages.frete_amount foi criada em 04/08/2026 pela migração
      // 20260804_auction_messages_frete_amount.sql (a 20260801_frete_leilao.sql havia
      // entrado pela metade: criou auctions.frete_reservado_valor e não esta) e sua
      // existência foi CONFIRMADA por leitura no banco antes desta alteração.
      // ⚠️ Histórico: enquanto a coluna não existia, este campo no INSERT fazia o
      // PostgREST devolver 42703 e TODO lance morria em "Não foi possível registrar o
      // lance" — produção ficou sem nenhum lance de 03/08 15:03 até o PONTO 83.
      // Nunca reintroduzir um campo aqui sem antes provar a coluna no banco.
      // O bid_amount continua sendo SÓ o produto; o frete é registro paralelo.
      frete_amount: freteValor,
      content: `Lance de R$ ${bidAmount.toFixed(2).replace('.', ',')}`,
      is_system_message: false,
    });
    const bidRow = Array.isArray(bidInsertResp.data) ? bidInsertResp.data[0] : null;

    if (!bidInsertResp.ok || !bidRow) {
      // Falhou o registro do lance → NADA é tocado: nem preço, nem winner_id, nem
      // version, nem a reserva do líder anterior. O saldo do usuário é devolvido pelo
      // caminho de erro do frontend (releaseHold), exatamente como já funcionava.
      return res.status(500).json({
        success: false,
        message: 'Não foi possível registrar o lance. Tente novamente.',
        debug: bidInsertResp.data,
      });
    }

    // PATCH atômico: só aplica se a version ainda for a mesma lida agora (CAS).
    const patchResp = await sb(
      `auctions?id=eq.${encodeURIComponent(auctionId)}&${versionFilter}`,
      'PATCH',
      {
        current_price: bidAmount,
        winner_id: userId,
        winner_name: winnerName,
        end_time: newEndTime,
        version: currentVersion + 1,
        frete_reservado_valor: freteValor,
      }
    );
    const patchedRow = Array.isArray(patchResp.data) ? patchResp.data[0] : null;

    if (!patchResp.ok || !patchedRow) {
      // 🧹 PONTO 72 — o lance foi gravado mas NÃO venceu a corrida: remove o registro
      // para o histórico não guardar um lance que nunca valeu (e o preço fica intacto).
      try { await sb(`auction_messages?id=eq.${encodeURIComponent(bidRow.id)}`, 'DELETE'); } catch (_) { /* best effort */ }

      // Conflito de versão: outro lance venceu a corrida. Devolve o estado real atual.
      const conflictResp = await sb(
        `auctions?id=eq.${encodeURIComponent(auctionId)}&select=current_price,winner_name,version`
      );
      const conflictAuction = Array.isArray(conflictResp.data) ? conflictResp.data[0] : null;
      return res.status(409).json({
        success: false,
        message: 'Outro lance foi dado antes. Tente novamente!',
        conflict: true,
        current_state: conflictAuction || { current_price: currentPrice, winner_name: auction.winner_name, version: currentVersion },
      });
    }

    // 🔄 DEVOLUÇÃO AO LÍDER ANTERIOR — este lance acabou de cobrir o dele.
    // O dinheiro volta AGORA para o saldo dele, para que possa relançar sem esperar
    // o leilão acabar (regra do dono, 08/08/2026). O que continua preso é o uso
    // desse dinheiro na Loja Virtual, e isso é resolvido no checkout da loja pelo
    // cálculo de compromisso (_lib/compromissoLeilao.js) — não aqui.
    // Devolve o lance + o frete que ele tinha reservado junto. Só roda DEPOIS do
    // PATCH atômico ter vencido a corrida: se o lance não valeu, nada é devolvido.
    let releasedPrevious = null;
    if (auction.winner_id && auction.winner_id !== userId) {
      const valorAnterior = money(Number(auction.current_price || 0) + Number(auction.frete_reservado_valor || 0));
      const devolvido = await releaseHold(auction.winner_id, valorAnterior);
      if (devolvido > 0) releasedPrevious = { user_id: auction.winner_id, valor: devolvido };
    }

    return res.status(200).json({
      success: true,
      message: 'Lance registrado com sucesso!',
      released_previous: releasedPrevious,
      new_state: {
        current_price: patchedRow.current_price,
        winner_name: patchedRow.winner_name,
        version: patchedRow.version,
        end_time: patchedRow.end_time,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Erro ao processar lance: ' + String(e?.message || e) });
  }
}