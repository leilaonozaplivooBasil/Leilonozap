import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { user_id, amount, auction_id, description } = await req.json();

        if (!user_id || !amount || amount <= 0) {
            return Response.json({ error: 'user_id e amount (>0) são obrigatórios' }, { status: 400 });
        }

        // Busca carteira digital do usuário via service role
        const wallets = await base44.asServiceRole.entities.DigitalWallet.filter({ user_id });

        if (!wallets || wallets.length === 0) {
            return Response.json({ success: false, error: 'Carteira não encontrada', balance: 0 }, { status: 400 });
        }

        const wallet = wallets[0];
        const currentBalance = wallet.balance || 0;

        // Verificação de saldo
        if (currentBalance < amount) {
            return Response.json({ 
                success: false, 
                error: 'Saldo insuficiente', 
                balance: currentBalance,
                required: amount,
                deficit: amount - currentBalance
            }, { status: 400 });
        }

        // Debita o valor
        const newBalance = currentBalance - amount;
        await base44.asServiceRole.entities.DigitalWallet.update(wallet.id, { 
            balance: newBalance 
        });

        // Registra a transação
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

        console.log(`✅ Débito realizado: user=${user_id}, valor=R$ ${amount.toFixed(2)}, saldo anterior=R$ ${currentBalance.toFixed(2)}, novo saldo=R$ ${newBalance.toFixed(2)}`);

        return Response.json({ 
            success: true, 
            previous_balance: currentBalance,
            debited: amount,
            new_balance: newBalance,
            wallet_id: wallet.id
        });

    } catch (error) {
        console.error('Erro debitWalletBalance:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});