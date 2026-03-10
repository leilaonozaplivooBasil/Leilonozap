import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * finalizeAuction.ts
 *
 * Edge Function segura para encerrar um leilão.
 * O Frontend (AuctionRoom.jsx) chama esta função em vez de chamar
 * Auction.update() diretamente. Toda a lógica crítica roda no Backend
 * com ServiceRole, impedindo manipulação de dados por atacantes.
 *
 * Validações obrigatórias:
 * - Usuário autenticado
 * - Usuário tem papel de admin/auctioneer (role === 'admin' ou 'auctioneer')
 * - Leilão existe e está nos estados 'active' ou 'processing'
 */
Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    try {
        const base44 = createClientFromRequest(req);

        // 🔐 1. VERIFICAR AUTENTICAÇÃO
        const user = await base44.auth.me();
        if (!user) {
            console.error('🚫 [FINALIZE] Tentativa de encerrar leilão sem autenticação!');
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // 🔐 2. VERIFICAR PERMISSÃO — Somente admin ou auctioneer pode encerrar
        const appUsers = await base44.asServiceRole.entities.AppUser.filter({ id: user.id });
        const appUser = appUsers?.[0];

        if (!appUser || (appUser.role !== 'admin' && appUser.role !== 'auctioneer')) {
            console.error(`🚫 [FINALIZE] Usuário ${user.id} (role: ${appUser?.role}) tentou encerrar leilão sem permissão!`);
            return Response.json({ error: 'Permissão negada' }, { status: 403 });
        }

        const { auction_id } = await req.json();

        if (!auction_id) {
            return Response.json({ error: 'auction_id é obrigatório' }, { status: 400 });
        }

        // 🔍 3. BUSCAR E VALIDAR LEILÃO
        const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });
        if (!auctions || auctions.length === 0) {
            return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
        }

        const auction = auctions[0];

        if (auction.status !== 'active' && auction.status !== 'processing') {
            return Response.json({
                error: `Leilão não pode ser encerrado. Status atual: ${auction.status}`
            }, { status: 400 });
        }

        const winnerId = auction.winner_id;
        const winnerName = auction.winner_name || 'Sem vencedor';
        const finalPrice = auction.current_price || auction.starting_price;

        console.log(`🏁 [FINALIZE] Encerrando leilão ${auction_id}: Vencedor=${winnerName} R$ ${finalPrice}`);

        // ✅ 4. ATUALIZAR LEILÃO — Somente no Backend com ServiceRole
        await base44.asServiceRole.entities.Auction.update(auction_id, {
            status: 'ended',
            winner_id: winnerId,
            winner_name: winnerName,
            current_price: finalPrice,
            order_status: 'awaiting_payment'
        });

        console.log(`✅ [FINALIZE] Leilão ${auction_id} encerrado.`);

        // ✅ 5. ATUALIZAR STATS DO VENCEDOR — Somente no Backend com ServiceRole
        if (winnerId) {
            try {
                const winnerUsers = await base44.asServiceRole.entities.AppUser.filter({ id: winnerId });
                if (winnerUsers && winnerUsers.length > 0) {
                    const winner = winnerUsers[0];
                    await base44.asServiceRole.entities.AppUser.update(winnerId, {
                        won_auctions: (winner.won_auctions || 0) + 1,
                        points: (winner.points || 0) + 50
                    });
                    console.log(`✅ [FINALIZE] Stats do vencedor ${winnerName} atualizados.`);
                }
            } catch (statsErr) {
                console.warn(`⚠️ [FINALIZE] Erro ao atualizar stats do vencedor (não-bloqueante):`, statsErr.message);
            }
        }

        // ✅ 6. REGISTRAR LOG
        await base44.asServiceRole.entities.SystemLog.create({
            entity_id: auction_id,
            component_name: 'finalizeAuction',
            step: 'AUCTION_FINALIZED',
            status: 'success',
            message: `Leilão encerrado por ${appUser.full_name || user.id}. Vencedor: ${winnerName} com R$ ${finalPrice}`
        });

        return Response.json({
            success: true,
            message: 'Leilão encerrado com sucesso!',
            result: {
                auction_id,
                winner_id: winnerId,
                winner_name: winnerName,
                final_price: finalPrice,
                status: 'ended'
            }
        });

    } catch (error) {
        console.error('❌ [FINALIZE] Erro fatal:', error);
        return Response.json({
            success: false,
            error: 'Erro ao encerrar leilão: ' + error.message
        }, { status: 500 });
    }
});
