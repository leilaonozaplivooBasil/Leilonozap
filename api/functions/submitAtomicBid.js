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

// Devolve `amount` de saldo_reservado → saldo_disponivel do usuário (mesma lógica de
// api/_lib/bidHold.js, inline). Nunca lança erro — falha aqui não pode derrubar o lance.
async function releaseHold(userId, amount) {
  const uid = String(userId || '').trim();
  const valor = money(amount);
  if (!uid || valor <= 0) return { released: 0, reason: 'parametros_invalidos' };
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const userResp = await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${encodeURIComponent(uid)}&limit=1`);
      const user = Array.isArray(userResp.data) ? userResp.data[0] : null;
      if (!user) return { released: 0, reason: 'usuario_nao_encontrado' };

      const disponivel = money(user.saldo_disponivel);
      const reservado = money(user.saldo_reservado);
      const liberar = money(Math.min(valor, reservado));
      if (liberar <= 0) return { released: 0, reason: 'sem_reserva' };

      const dispFilter = disponivel === 0 ? `or(saldo_disponivel.eq.0,saldo_disponivel.is.null)` : `saldo_disponivel.eq.${disponivel}`;
      const resFilter = reservado === 0 ? `or(saldo_reservado.eq.0,saldo_reservado.is.null)` : `saldo_reservado.eq.${reservado}`;
      const patchResp = await sb(
        `app_users?id=eq.${encodeURIComponent(uid)}&and=(${dispFilter},${resFilter})`,
        'PATCH',
        { saldo_disponivel: money(disponivel + liberar), saldo_reservado: money(reservado - liberar) }
      );
      const row = Array.isArray(patchResp.data) ? patchResp.data[0] : null;
      if (row) {
        return { released: liberar, new_balance: money(row.saldo_disponivel), new_held: money(row.saldo_reservado) };
      }
      // corrida: alguém mexeu no saldo entre a leitura e a escrita — tenta de novo
    }
    return { released: 0, reason: 'corrida' };
  } catch (e) {
    return { released: 0, reason: String(e?.message || e) };
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
      return res.status(404).json({ success: false, message: 'Leilão não encontrado' });
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

    const currentPrice = Number(auction.current_price || auction.starting_price);
    const minBid = currentPrice + Number(auction.increment);

    if (bidAmount <= currentPrice) {
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

    // 🔓 DEVOLUÇÃO DA RESERVA DO LÍDER ANTERIOR — no servidor, no mesmo instante em que
    // este lance venceu. Antes isso dependia do navegador de quem dava o próximo lance,
    // então quem era coberto e não voltava a dar lance ficava com o dinheiro travado.
    // Libera EXATAMENTE o preço anterior daquele leilão (regra por leilão preservada:
    // nunca "tudo", para não tocar em reservas de outros leilões do mesmo usuário).
    // 🚚 Libera lance + frete que estavam reservados para o líder anterior
    // (o frete dele foi lido ANTES deste PATCH sobrescrever com o novo valor).
    const previousFrete = Number(auction.frete_reservado_valor) || 0;
    let released = null;
    if (auction.winner_id && (currentPrice > 0 || previousFrete > 0)) {
      released = await releaseHold(auction.winner_id, currentPrice + previousFrete);
    }

    return res.status(200).json({
      success: true,
      message: 'Lance registrado com sucesso!',
      released_previous: released,
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