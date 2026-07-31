// 🔒 Confirma o lance no leilão com TRAVA OTIMISTA real (version) direto no Supabase.
// Só existe pra resolver a condição de corrida: dois lances simultâneos não podem mais
// os dois "passar" e sobrescrever um ao outro — só um vence o PATCH condicionado à version.
// NUNCA usar base44.asServiceRole.entities.* aqui (aponta pro store interno do Base44,
// não pro Supabase real que a produção lê).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function sbFetch(path: string, method = 'GET', body?: object) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { ok: res.ok, status: res.status, data: json };
}

const COUNTDOWN_DURATION = 142; // 2min22s
const BID_EXTENSION_SECONDS = 22;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();
    if (!authUser) {
      return Response.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    const { auction_id, amount, bidder_name } = await req.json();
    const bidAmount = parseFloat(amount);

    if (!auction_id || !bidAmount || bidAmount <= 0) {
      return Response.json({ success: false, message: 'Parâmetros inválidos' }, { status: 400 });
    }

    const getResp = await sbFetch(`auctions?id=eq.${auction_id}&select=id,current_price,starting_price,increment,status,end_time,version,winner_id,winner_name`);
    const auction = Array.isArray(getResp.data) ? getResp.data[0] : null;

    if (!getResp.ok || !auction) {
      return Response.json({ success: false, message: 'Leilão não encontrado' }, { status: 404 });
    }

    if (auction.status !== 'active') {
      return Response.json({
        success: false,
        message: 'Leilão não está ativo',
        current_state: { current_price: auction.current_price, status: auction.status, winner_name: auction.winner_name }
      }, { status: 400 });
    }

    const now = Date.now();
    const endTime = new Date(auction.end_time).getTime();
    if (now >= endTime) {
      return Response.json({
        success: false,
        message: 'Leilão já encerrou',
        current_state: { current_price: auction.current_price, status: auction.status, end_time: auction.end_time }
      }, { status: 400 });
    }

    const currentPrice = Number(auction.current_price || auction.starting_price);
    const minBid = currentPrice + Number(auction.increment);

    if (bidAmount <= currentPrice) {
      return Response.json({
        success: false,
        message: `Lance deve ser maior que R$ ${currentPrice.toFixed(2)}`,
        conflict: true,
        current_state: { current_price: currentPrice, min_bid: minBid, winner_name: auction.winner_name }
      }, { status: 409 });
    }

    if (bidAmount < minBid) {
      return Response.json({
        success: false,
        message: `Lance mínimo: R$ ${minBid.toFixed(2)}`,
        current_state: { current_price: currentPrice, min_bid: minBid, winner_name: auction.winner_name }
      }, { status: 400 });
    }

    const timeUntilEnd = Math.floor((endTime - now) / 1000);
    let newEndTime = auction.end_time;
    if (timeUntilEnd <= COUNTDOWN_DURATION) {
      newEndTime = new Date(endTime + BID_EXTENSION_SECONDS * 1000).toISOString();
    }

    const currentVersion = auction.version || 0;
    const winnerName = bidder_name || authUser.full_name || 'Anônimo';

    // PATCH atômico: só aplica se a version ainda for a mesma lida agora (CAS).
    // Se outro lance já foi commitado entre a leitura e este PATCH, a condição
    // version=eq.X falha e a resposta vem vazia — SEM sobrescrever o vencedor real.
    const patchResp = await sbFetch(
      `auctions?id=eq.${auction_id}&version=eq.${currentVersion}`,
      'PATCH',
      {
        current_price: bidAmount,
        winner_id: authUser.id,
        winner_name: winnerName,
        end_time: newEndTime,
        version: currentVersion + 1
      }
    );
    const patchedRow = Array.isArray(patchResp.data) ? patchResp.data[0] : null;

    if (!patchResp.ok || !patchedRow) {
      // Conflito de versão: outro lance venceu a corrida. Devolve o estado real atual.
      const conflictResp = await sbFetch(`auctions?id=eq.${auction_id}&select=current_price,winner_name,version`);
      const conflictAuction = Array.isArray(conflictResp.data) ? conflictResp.data[0] : null;
      return Response.json({
        success: false,
        message: 'Outro lance foi dado antes. Tente novamente!',
        conflict: true,
        current_state: conflictAuction || { current_price: currentPrice, winner_name: auction.winner_name, version: currentVersion }
      }, { status: 409 });
    }

    return Response.json({
      success: true,
      message: 'Lance registrado com sucesso!',
      new_state: {
        current_price: patchedRow.current_price,
        winner_name: patchedRow.winner_name,
        version: patchedRow.version,
        end_time: patchedRow.end_time
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [ATOMIC BID] Erro fatal:', error.message);
    return Response.json({ success: false, message: 'Erro ao processar lance: ' + error.message }, { status: 500 });
  }
});