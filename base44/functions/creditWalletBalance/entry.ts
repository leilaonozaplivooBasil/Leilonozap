import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { user_id, amount, auction_id, description, type } = await req.json();

        if (!user_id || !amount || amount <= 0) {
            return Response.json({ error: 'user_id e amount (>0) são obrigatórios' }, { status: 400 });
        }

        // 🛡️ CRÉDITO ATÔMICO — updateMany com $inc
        // Soma atômica ao saldo, elimina race condition do read-modify-write.

        // 1. Lê saldo anterior (para resposta)
        const walletsBefore = await base44.asServiceRole.entities.DigitalWallet.filter({ user_id });
        if (!walletsBefore || walletsBefore.length === 0) {
            return Response.json({ success: false, error: 'Carteira não encontrada', balance: 0 }, { status: 400 });
        }
        const previousBalance = walletsBefore.reduce((sum, w) => sum + (w.balance || 0), 0);

        // 2. Crédito atômico: $inc soma ao saldo de todas as carteiras do usuário
        await base44.asServiceRole.entities.DigitalWallet.updateMany(
            { user_id },
            { $inc: { balance: amount } }
        );

        // 3. Lê saldo novo
        const walletsAfter = await base44.asServiceRole.entities.DigitalWallet.filter({ user_id });
        const newBalance = walletsAfter.reduce((sum, w) => sum + (w.balance || 0), 0);

        // 4. Registra a transação APÓS sucesso atômico
        try {
            await base44.asServiceRole.entities.DigitalWalletTransaction.create({
                user_id: user_id,
                type: type || 'auction_refund',
                direction: 'credit',
                amount: amount,
                related_auction_id: auction_id || null,
                status: 'confirmed',
                description: description || `Reembolso de lance - R$ ${amount.toFixed(2)}`
            });
        } catch (txError) {
            console.error('Erro ao registrar transação de reembolso (crédito já realizado):', txError.message);
        }

        console.log(`✅ Crédito atômico: user=${user_id}, valor=R$ ${amount.toFixed(2)}, saldo anterior=R$ ${previousBalance.toFixed(2)}, novo saldo=R$ ${newBalance.toFixed(2)}`);

        return Response.json({
            success: true,
            previous_balance: previousBalance,
            credited: amount,
            new_balance: newBalance,
            wallet_id: walletsAfter[0]?.id
        });

    } catch (error) {
        console.error('Erro creditWalletBalance:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});