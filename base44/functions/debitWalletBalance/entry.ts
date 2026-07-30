import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { user_id, amount, auction_id, description } = await req.json();

        if (!user_id || !amount || amount <= 0) {
            return Response.json({ error: 'user_id e amount (>0) são obrigatórios' }, { status: 400 });
        }

        // 🛡️ DÉBITO ATÔMICO — updateMany com filtro condicional + $inc
        // A operação é atômica no banco: só debita se balance >= amount.
        // Elimina a race condition do read-modify-write anterior.
        
        // 1. Lê saldo anterior (para resposta e verificação)
        const walletsBefore = await base44.asServiceRole.entities.DigitalWallet.filter({ user_id });
        if (!walletsBefore || walletsBefore.length === 0) {
            return Response.json({ success: false, error: 'Carteira não encontrada', balance: 0 }, { status: 400 });
        }
        const previousBalance = walletsBefore.reduce((sum, w) => sum + (w.balance || 0), 0);

        // 2. Débito atômico: só afeta registros onde balance >= amount
        await base44.asServiceRole.entities.DigitalWallet.updateMany(
            { user_id, balance: { $gte: amount } },
            { $inc: { balance: -amount } }
        );

        // 3. Lê saldo novo para confirmar se o débito ocorreu
        const walletsAfter = await base44.asServiceRole.entities.DigitalWallet.filter({ user_id });
        const newBalance = walletsAfter.reduce((sum, w) => sum + (w.balance || 0), 0);

        // 4. Se o saldo não diminuiu, o débito falhou (saldo insuficiente)
        if (newBalance >= previousBalance) {
            return Response.json({
                success: false,
                error: 'Saldo insuficiente',
                balance: newBalance,
                required: amount,
                deficit: amount - newBalance
            }, { status: 400 });
        }

        // 5. Registra a transação APÓS sucesso atômico
        try {
            await base44.asServiceRole.entities.DigitalWalletTransaction.create({
                user_id: user_id,
                type: 'auction_payment',
                direction: 'debit',
                amount: amount,
                related_auction_id: auction_id || null,
                status: 'confirmed',
                description: description || `Débito de lance/arremate - R$ ${amount.toFixed(2)}`
            });
        } catch (txError) {
            console.error('Erro ao registrar transação (débito já realizado):', txError.message);
        }

        console.log(`✅ Débito atômico: user=${user_id}, valor=R$ ${amount.toFixed(2)}, saldo anterior=R$ ${previousBalance.toFixed(2)}, novo saldo=R$ ${newBalance.toFixed(2)}`);

        return Response.json({
            success: true,
            previous_balance: previousBalance,
            debited: amount,
            new_balance: newBalance,
            wallet_id: walletsAfter[0]?.id
        });

    } catch (error) {
        console.error('Erro debitWalletBalance:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});