import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { user_id } = await req.json();
        
        if (!user_id) {
            return Response.json({ error: 'user_id obrigatório' }, { status: 400 });
        }

        // Busca wallet e transações com service role para contornar RLS
        const [wallets, transactions] = await Promise.all([
            base44.asServiceRole.entities.DigitalWallet.filter({ user_id }),
            base44.asServiceRole.entities.DigitalWalletTransaction.filter(
                { user_id },
                '-created_date',
                100
            )
        ]);

        const wallet = wallets && wallets.length > 0 ? wallets[0] : null;

        return Response.json({
            wallet: wallet ? { id: wallet.id, balance: wallet.balance || 0 } : null,
            transactions: (transactions || []).map(t => ({
                id: t.id,
                type: t.type,
                direction: t.direction,
                amount: t.amount,
                status: t.status,
                description: t.description,
                related_payment_id: t.related_payment_id,
                created_date: t.created_date
            }))
        });

    } catch (error) {
        console.error('Erro getDigitalWalletHistory:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});