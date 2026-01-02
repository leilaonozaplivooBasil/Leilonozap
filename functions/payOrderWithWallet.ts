import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { order_id } = await req.json();

        if (!order_id) {
            return Response.json({ error: 'order_id é obrigatório' }, { status: 400 });
        }

        // Buscar ordem (leilão arrematado)
        const auctions = await base44.asServiceRole.entities.Auction.filter({ 
            id: order_id,
            winner_id: user.id
        });

        if (auctions.length === 0) {
            return Response.json({ 
                error: 'Leilão não encontrado ou você não é o vencedor' 
            }, { status: 404 });
        }

        const auction = auctions[0];

        // Verificar se já foi pago
        if (auction.order_status === 'paid') {
            return Response.json({ 
                error: 'Este leilão já foi pago' 
            }, { status: 400 });
        }

        const total_amount = auction.current_price;

        // Buscar carteira do usuário
        const wallets = await base44.asServiceRole.entities.Wallet.filter({ 
            user_id: user.id 
        });

        if (wallets.length === 0) {
            return Response.json({ 
                success: false,
                insufficient_balance: true,
                required_amount: total_amount,
                current_balance: 0,
                message: 'Você não possui saldo. Adicione saldo para continuar.'
            }, { status: 200 });
        }

        const wallet = wallets[0];
        const current_balance = wallet.balance || 0;

        // Verificar se tem saldo suficiente
        if (current_balance < total_amount) {
            return Response.json({ 
                success: false,
                insufficient_balance: true,
                required_amount: total_amount,
                current_balance: current_balance,
                missing_amount: total_amount - current_balance,
                message: 'Saldo insuficiente. Adicione mais saldo para continuar.'
            }, { status: 200 });
        }

        console.log('💰 Processando pagamento com saldo...');

        // Criar transação de débito
        const transaction = await base44.asServiceRole.entities.WalletTransaction.create({
            user_id: user.id,
            type: 'purchase',
            direction: 'debit',
            amount: total_amount,
            related_auction_id: order_id,
            status: 'confirmed',
            description: `Compra: ${auction.title}`
        });

        // Atualizar saldo da carteira
        const new_balance = current_balance - total_amount;
        await base44.asServiceRole.entities.Wallet.update(wallet.id, {
            balance: new_balance
        });

        // Criar registro de pagamento
        await base44.asServiceRole.entities.Payment.create({
            auction_id: order_id,
            buyer_id: user.id,
            buyer_name: user.full_name,
            buyer_email: user.email,
            amount: total_amount,
            payment_method: 'wallet',
            status: 'paid',
            payment_date: new Date().toISOString()
        });

        // Atualizar status do leilão
        await base44.asServiceRole.entities.Auction.update(order_id, {
            order_status: 'paid'
        });

        console.log('✅ Pagamento concluído!');

        return Response.json({ 
            success: true,
            message: 'Pagamento realizado com sucesso!',
            transaction_id: transaction.id,
            new_balance: new_balance
        }, { status: 200 });

    } catch (error) {
        console.error('❌ Erro ao processar pagamento:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});