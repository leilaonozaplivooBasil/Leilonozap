// finalizeAuctionCore — lógica ÚNICA de arremate no servidor (service role).
// Usada por dois caminhos:
//   • api/functions/finalizeAuction.js — chamado pelo cliente quando o relógio da sala zera
//   • api/functions/finalizeExpiredAuctions.js — cron da Vercel (1x/min) que arremata
//     TODO leilão vencido mesmo sem ninguém na sala
// O claim atômico (WHERE status in active/processing) garante que os dois caminhos
// nunca dupliquem efeitos: só um executa, o outro recebe o consolidado.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

// tolerância pra deriva de relógio entre cliente e servidor (nunca encerra
// um leilão com mais de 2s restantes)
export const GRACE_MS = 2000;
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400';

export const hasServerEnv = () => Boolean(SUPABASE_URL && SR);

export function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}
export const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const enc = encodeURIComponent;

export async function fetchAuction(auctionId) {
  const rows = await (await sb(`auctions?select=*&id=eq.${enc(auctionId)}&limit=1`)).json();
  return Array.isArray(rows) ? rows[0] : null;
}

export function resultPayload(auction, extra = {}) {
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

// Executa o arremate de UM leilão já validado como active/processing e vencido.
// Retorna o payload consolidado (mesmo shape do finalizeAuction original).
export async function finalizeOneAuction(auction) {
  const auctionId = auction.id;

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
    return resultPayload(fresh || auction, { already_finalized: true });
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

  // 💬 Mensagem de encerramento no chat — idempotente (só se ainda não existir).
  // Com vencedor: card de vitória. Sem lances: o mesmo card renderiza o modo
  // "encerrado sem lances" no cliente (winner: null).
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

  return resultPayload(finalAuction, {
    winner: winnerData,
    victory_message_created: victoryMessageCreated,
  });
}
