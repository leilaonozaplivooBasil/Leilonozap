// finalizeAuction — encerramento REAL do leilão no servidor (service role).
//
// Antes: o frontend chamava esta função, ela NÃO EXISTIA (stub) e todo o arremate
// rodava no navegador (status, vencedor, comissão) — ou seja, uma simulação que
// qualquer cliente podia disparar/manipular. Agora o servidor é a autoridade:
//
//   • Só encerra se o relógio DO SERVIDOR confirmar que end_time passou.
//   • O vencedor é apurado AQUI, pelo maior lance gravado em auction_messages.
//   • Transição active/processing → ended é atômica (guard no WHERE): dois
//     clientes chamando ao mesmo tempo → só um executa os efeitos, o outro
//     recebe o resultado já consolidado (idempotente).
//   • Mensagem de vitória, stats do vencedor e comissão do licenciado (3%)
//     são efeitos do servidor — o cliente só exibe.
//
// Qualquer cliente pode chamar (participante ou espectador): o resultado é
// determinístico e o gate é o tempo real do leilão, não o papel de quem chama.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

// tolerância pra deriva de relógio entre cliente e servidor (nunca encerra
// um leilão com mais de 2s restantes)
const GRACE_MS = 2000;
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400';

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const enc = encodeURIComponent;

async function fetchAuction(auctionId) {
  const rows = await (await sb(`auctions?select=*&id=eq.${enc(auctionId)}&limit=1`)).json();
  return Array.isArray(rows) ? rows[0] : null;
}

function resultPayload(auction, extra = {}) {
  return {
    success: true,
    result: {
      auction_id: auction.id,
      status: auction.status,
      winner_id: auction.winner_id || null,
      winner_name: auction.winner_name || null,
      final_price: money(auction.current_price || auction.starting_price),
      order_status: auction.order_status || null,
      ...extra,
    },
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const auctionId = String(body?.auction_id || '').trim();
    if (!auctionId) return res.status(400).json({ success: false, error: 'auction_id é obrigatório' });

    const auction = await fetchAuction(auctionId);
    if (!auction) return res.status(404).json({ success: false, error: 'Leilão não encontrado' });

    // Idempotência: já encerrado → devolve o resultado consolidado, sem refazer efeitos.
    if (auction.status === 'ended' || auction.status === 'sold') {
      return res.status(200).json(resultPayload(auction, { already_finalized: true }));
    }
    if (auction.status !== 'active' && auction.status !== 'processing') {
      return res.status(400).json({ success: false, error: `Leilão não pode ser encerrado (status: ${auction.status})` });
    }

    // ⏱️ GATE REAL: o relógio do SERVIDOR decide, não o do navegador.
    const now = Date.now();
    const endTime = new Date(auction.end_time).getTime();
    if (!Number.isFinite(endTime)) return res.status(400).json({ success: false, error: 'end_time inválido' });
    if (endTime - now > GRACE_MS) {
      return res.status(200).json({
        success: false,
        error: 'Leilão ainda não terminou',
        seconds_remaining: Math.ceil((endTime - now) / 1000),
      });
    }

    // 🏆 Apura o vencedor pelo MAIOR lance realmente gravado no banco.
    const bids = await (await sb(
      `auction_messages?select=sender_id,sender_name,bid_amount,created_date&auction_id=eq.${enc(auctionId)}&message_type=eq.bid&order=bid_amount.desc.nullslast,created_date.asc&limit=1`
    )).json();
    const topBid = Array.isArray(bids) ? bids[0] : null;

    const winnerId = topBid?.sender_id || null;
    const winnerName = topBid?.sender_name || null;
    const finalPrice = money(topBid?.bid_amount || auction.current_price || auction.starting_price);

    // 🔒 Claim atômico: só UM finalizador vence esta corrida.
    const claim = await sb(
      `auctions?id=eq.${enc(auctionId)}&status=in.(active,processing)`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'ended',
          winner_id: winnerId,
          winner_name: winnerName,
          current_price: finalPrice,
          order_status: winnerId ? 'awaiting_payment' : null,
        }),
      }
    );
    const claimed = await claim.json().catch(() => []);
    if (!Array.isArray(claimed) || claimed.length === 0) {
      // outro chamador encerrou primeiro — devolve o consolidado
      const fresh = await fetchAuction(auctionId);
      return res.status(200).json(resultPayload(fresh || auction, { already_finalized: true }));
    }
    const finalAuction = claimed[0];

    // 👤 Dados completos do vencedor (para a mensagem de vitória)
    let winnerData = null;
    if (winnerId) {
      const users = await (await sb(
        `app_users?select=id,full_name,nickname,email,avatar_url,won_auctions,points,referred_by_id&id=eq.${enc(winnerId)}&limit=1`
      )).json();
      const u = Array.isArray(users) ? users[0] : null;
      winnerData = {
        id: winnerId,
        full_name: u?.full_name || winnerName || 'Vencedor',
        nickname: u?.nickname || winnerName || 'Vencedor',
        email: u?.email || '',
        avatar_url: u?.avatar_url || null,
      };

      // 📈 Stats do vencedor (não-bloqueante)
      if (u) {
        try {
          await sb(`app_users?id=eq.${enc(winnerId)}`, {
            method: 'PATCH',
            body: JSON.stringify({
              won_auctions: (Number(u.won_auctions) || 0) + 1,
              points: (Number(u.points) || 0) + 100,
            }),
          });
        } catch (e) { console.warn('[FINALIZE] stats vencedor:', e?.message); }

        // 💰 Comissão do licenciado: 3% do arremate (regra vigente), saldo de
        // teste ou real conforme is_test_auction. Planos de investimento não comissionam.
        if (u.referred_by_id && !auction.is_investment_plan) {
          try {
            const lic = (await (await sb(
              `app_users?select=id,network_bids_count,commission_balance,test_valora_balance,valora_pay_balance&id=eq.${enc(u.referred_by_id)}&limit=1`
            )).json())?.[0];
            if (lic) {
              const commission = money(finalPrice * 0.03);
              const patch = {
                network_bids_count: (Number(lic.network_bids_count) || 0) + 1,
                commission_balance: money((Number(lic.commission_balance) || 0) + commission),
              };
              if (auction.is_test_auction === true) {
                patch.test_valora_balance = money((Number(lic.test_valora_balance) || 0) + commission);
              } else {
                patch.valora_pay_balance = money((Number(lic.valora_pay_balance) || 0) + commission);
              }
              await sb(`app_users?id=eq.${enc(lic.id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
            }
          } catch (e) { console.warn('[FINALIZE] comissão licenciado:', e?.message); }
        }
      }
    }

    // 💬 Mensagem de vitória no chat — idempotente (só se ainda não existir)
    let victoryMessageCreated = false;
    try {
      const existing = await (await sb(
        `auction_messages?select=id&auction_id=eq.${enc(auctionId)}&message_type=eq.winner_announcement&limit=1`
      )).json();
      if (!Array.isArray(existing) || existing.length === 0) {
        const imgs = Array.isArray(auction.image_urls) ? auction.image_urls : [];
        const victoryData = {
          winner: winnerData,
          auction: {
            id: auction.id,
            title: auction.title || 'Produto',
            image_urls: [imgs[0] || FALLBACK_IMAGE],
            current_price: finalPrice,
            starting_price: money(auction.starting_price),
          },
        };
        await sb('auction_messages', {
          method: 'POST',
          body: JSON.stringify({
            auction_id: auctionId,
            message_type: 'winner_announcement',
            content: JSON.stringify(victoryData),
            sender_name: 'LanceIA',
            is_system_message: true,
            created_date: new Date().toISOString(),
          }),
        });
        victoryMessageCreated = true;
      }
    } catch (e) { console.warn('[FINALIZE] mensagem de vitória:', e?.message); }

    // 🧾 Log de sistema (best effort)
    try {
      await sb('system_logs', {
        method: 'POST',
        body: JSON.stringify({
          entity_id: auctionId,
          component_name: 'finalizeAuction',
          step: 'AUCTION_FINALIZED',
          status: 'success',
          message: `Encerrado no servidor. Vencedor: ${winnerName || 'sem lances'} — R$ ${finalPrice.toFixed(2)}`,
          created_date: new Date().toISOString(),
        }),
      });
    } catch (_) { /* log é opcional */ }

    return res.status(200).json(resultPayload(finalAuction, {
      winner: winnerData,
      victory_message_created: victoryMessageCreated,
    }));
  } catch (e) {
    console.error('[FINALIZE] erro fatal:', e);
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
