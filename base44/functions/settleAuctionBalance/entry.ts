// 🏦 Fecha o leilão direto no Supabase (app_users.saldo_reservado / saldo_disponivel)
// via REST + service_role. NUNCA usar base44.asServiceRole.entities.* aqui (não aponta pro Supabase real).
// Fonte dos lances de cada usuário: auction_messages (message_type='bid'), já que
// DigitalWalletTransaction (ledger por lance) foi removida nesta migração.

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

Deno.serve(async (req) => {
    try {
        const { auction_id, winner_id, final_price } = await req.json();

        if (!auction_id || !winner_id) {
            return Response.json({
                success: false,
                error: 'auction_id e winner_id são obrigatórios'
            }, { status: 400 });
        }

        console.log(`🏦 [SETTLE] Iniciando settlement: auction=${auction_id}, winner=${winner_id}, price=R$ ${(final_price || 0).toFixed(2)}`);

        const MAX_RETRIES = 3;

        // 1. Busca os lances desse leilão pra saber quem tem reserva pendente e quanto
        const bidsResp = await sbFetch(`auction_messages?auction_id=eq.${auction_id}&message_type=eq.bid&select=sender_id,bid_amount,created_date&order=created_date.desc`);
        const bids = Array.isArray(bidsResp.data) ? bidsResp.data : [];

        // Último (mais recente) lance de cada usuário = reserva ainda ativa dele nesse leilão
        // (lances anteriores do mesmo usuário já foram liberados via releaseBidHold quando ele rebateu)
        const lastBidByUser = new Map<string, number>();
        for (const b of bids) {
            if (!b.sender_id || lastBidByUser.has(b.sender_id)) continue;
            lastBidByUser.set(b.sender_id, Number(b.bid_amount) || 0);
        }

        let winnerCharged = 0;
        let losersRefunded = 0;
        let totalRefunded = 0;
        const refundedList: { user_id: string; amount: number }[] = [];

        // 2. VENCEDOR: débito definitivo — zera o saldo_reservado
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const getResp = await sbFetch(`app_users?id=eq.${winner_id}&select=id,saldo_reservado`);
            const winnerUser = Array.isArray(getResp.data) ? getResp.data[0] : null;

            if (!getResp.ok || !winnerUser) {
                console.error('❌ [SETTLE] Vencedor não encontrado:', winner_id);
                break;
            }

            const reservadoAtual = Number(winnerUser.saldo_reservado) || 0;
            winnerCharged = reservadoAtual;

            if (reservadoAtual <= 0) break;

            const patchResp = await sbFetch(
                `app_users?id=eq.${winner_id}&saldo_reservado=eq.${reservadoAtual}`,
                'PATCH',
                { saldo_reservado: 0 }
            );
            const patchedRow = Array.isArray(patchResp.data) ? patchResp.data[0] : null;

            if (patchResp.ok && patchedRow && Math.abs((patchedRow.saldo_reservado || 0)) < 0.01) {
                console.log(`🏆 [SETTLE] Vencedor ${winner_id}: saldo_reservado zerado (débito definitivo R$ ${winnerCharged.toFixed(2)})`);
                break;
            }

            console.warn(`⚠️ [RETRY ${attempt}/${MAX_RETRIES}] Débito do vencedor não aplicado (condição de corrida). Reavaliando...`);
            if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 200 * attempt));
        }

        // 3. PERDEDORES: devolve saldo_reservado de cada um que tem lance nesse leilão
        for (const [userId, bidAmount] of lastBidByUser) {
            if (userId === winner_id) continue;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                const getResp = await sbFetch(`app_users?id=eq.${userId}&select=id,saldo_disponivel,saldo_reservado`);
                const loser = Array.isArray(getResp.data) ? getResp.data[0] : null;
                if (!getResp.ok || !loser) break;

                const reservadoAtual = Number(loser.saldo_reservado) || 0;
                const valorLiberar = Math.min(bidAmount, reservadoAtual);
                if (valorLiberar <= 0) break;

                const novoDisponivel = (Number(loser.saldo_disponivel) || 0) + valorLiberar;
                const novoReservado = reservadoAtual - valorLiberar;

                const patchResp = await sbFetch(
                    `app_users?id=eq.${userId}&saldo_reservado=gte.${valorLiberar}`,
                    'PATCH',
                    { saldo_disponivel: novoDisponivel, saldo_reservado: novoReservado }
                );
                const patchedRow = Array.isArray(patchResp.data) ? patchResp.data[0] : null;

                if (
                    patchResp.ok && patchedRow &&
                    Math.abs((patchedRow.saldo_disponivel || 0) - novoDisponivel) < 0.01 &&
                    Math.abs((patchedRow.saldo_reservado || 0) - novoReservado) < 0.01
                ) {
                    losersRefunded++;
                    totalRefunded += valorLiberar;
                    refundedList.push({ user_id: userId, amount: valorLiberar });
                    console.log(`💸 [SETTLE] Perdedor ${userId}: devolvido=R$ ${valorLiberar.toFixed(2)}`);
                    break;
                }

                console.warn(`⚠️ [RETRY ${attempt}/${MAX_RETRIES}] Reembolso do perdedor ${userId} não aplicado. Reavaliando...`);
                if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 200 * attempt));
            }
        }

        console.log(`✅ [SETTLE] Completo: vencedor cobrado=R$ ${winnerCharged.toFixed(2)}, perdedores reembolsados=${losersRefunded}, total devolvido=R$ ${totalRefunded.toFixed(2)}`);

        return Response.json({
            success: true,
            auction_id,
            winner_id,
            settled_amount: winnerCharged,
            winner_charged: winnerCharged,
            losers_refunded_count: losersRefunded,
            total_refunded: totalRefunded,
            refunded: refundedList
        });

    } catch (error) {
        console.error('Erro settleAuctionBalance:', error.message);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});