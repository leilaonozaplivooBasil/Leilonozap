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

// ⚠️ A função releaseHold foi REMOVIDA daqui em 08/08/2026 (regra oficial do dono):
// ser coberto não devolve mais o dinheiro, então este arquivo não libera reserva
// nenhuma. A devolução legítima acontece em dois lugares, e só neles:
//   • encerramento do leilão  → finalizeAuction
//   • rollback de lance que falhou → endpoint releaseBidHold

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
    const userResp = await sb(`app_users?select=id,full_name,nickname&id=eq.${encodeURIComponent(userId)}&limit=1`);
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

    if (bidAmount < minBid) {
      return res.status(400).json({
        success: false,
        message: `Lance mínimo: R$ ${minBid.toFixed(2)}`,
        current_state: { current_price: currentPrice, min_bid: minBid, winner_name: auction.winner_name },
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

    // 🔒 REGRA OFICIAL 08/08/2026 — SER COBERTO **NÃO** DEVOLVE O DINHEIRO.
    // Antes, no instante em que este lance vencia, a reserva do líder anterior era
    // devolvida para o saldo disponível dele. Isso deixava lance vivo na sala SEM
    // lastro na carteira: quem era coberto ficava com o dinheiro solto e, se voltasse
    // a vencer, não havia valor travado para honrar o arremate (auditoria de 08/08
    // achou 4 contas nessa situação, 2 delas com reserva ZERO e lance de pé).
    //
    // Pela regra do dono: o valor do lance fica RESERVADO até o LEILÃO ENCERRAR.
    // • Não venceu  → a devolução acontece no encerramento (finalizeAuction).
    // • Venceu      → o reservado é consumido no arremate.
    // Só o valor do LANCE fica preso — nunca o saldo total da carteira.
    //
    // ⚠️ NÃO reintroduzir releaseHold aqui. A devolução por rollback de lance que
    // FALHOU continua existindo e é outra coisa: roda pelo endpoint releaseBidHold.

    return res.status(200).json({
      success: true,
      message: 'Lance registrado com sucesso!',
      released_previous: null,
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