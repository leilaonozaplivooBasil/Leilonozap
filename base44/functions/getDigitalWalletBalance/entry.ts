import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { user_id } = await req.json();
        
        if (!user_id) {
            return Response.json({ error: 'user_id obrigatório' }, { status: 400 });
        }

        // Usa service role para contornar RLS
        const wallets = await base44.asServiceRole.entities.DigitalWallet.filter({ user_id });

        if (!wallets || wallets.length === 0) {
            return Response.json({ balance: 0, wallet_id: null });
        }

        // Soma o saldo de todas as wallets (caso existam duplicatas)
        const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

        // Se há múltiplas wallets, consolida em uma só
        if (wallets.length > 1) {
            const primary = wallets[0];
            for (let i = 1; i < wallets.length; i++) {
                try {
                    await base44.asServiceRole.entities.DigitalWallet.delete(wallets[i].id);
                } catch (e) {
                    console.error('Erro ao remover wallet duplicada:', e.message);
                }
            }
            if (totalBalance !== (primary.balance || 0)) {
                await base44.asServiceRole.entities.DigitalWallet.update(primary.id, { balance: totalBalance });
            }
            return Response.json({ balance: totalBalance, wallet_id: primary.id });
        }

        return Response.json({ balance: totalBalance, wallet_id: wallets[0].id });

    } catch (error) {
        console.error('Erro getDigitalWalletBalance:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});