import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar se é admin
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Acesso negado' }, { status: 403 });
        }

        // Buscar apenas wallets com paginação (limite 500)
        const wallets = await base44.asServiceRole.entities.Wallet.list(undefined, 500);
        
        if (!wallets || wallets.length === 0) {
            return Response.json({
                total_users: 0,
                total_balance: 0,
                wallets: []
            });
        }

        // Formatar resposta simples (sem buscar usuários)
        const walletData = wallets.map(w => ({
            user_id: w.user_id,
            balance: w.balance || 0
        })).sort((a, b) => b.balance - a.balance);

        const totalBalance = walletData.reduce((sum, w) => sum + w.balance, 0);
        const usersWithBalance = walletData.filter(w => w.balance > 0).length;

        return Response.json({
            total_users_with_wallet: walletData.length,
            users_with_positive_balance: usersWithBalance,
            total_balance_deposited: totalBalance.toFixed(2),
            wallets: walletData,
            summary: {
                average_balance: (totalBalance / walletData.length).toFixed(2),
                max_balance: Math.max(...walletData.map(w => w.balance)).toFixed(2),
                min_balance: Math.min(...walletData.map(w => w.balance)).toFixed(2)
            }
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});