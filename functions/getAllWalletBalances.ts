import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar se é admin
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Acesso negado' }, { status: 403 });
        }

        // Buscar todas as wallets
        const wallets = await base44.asServiceRole.entities.Wallet.list();
        
        if (!wallets || wallets.length === 0) {
            return Response.json({
                total_users: 0,
                total_balance: 0,
                wallets: []
            });
        }

        // Buscar todos os usuários para mapear
        const users = await base44.asServiceRole.entities.AppUser.list();
        const userMap = {};
        users.forEach(u => {
            userMap[u.id] = u;
        });

        // Montar resposta com dados detalhados
        const walletData = wallets.map(w => ({
            user_id: w.user_id,
            user_name: userMap[w.user_id]?.full_name || 'Usuário não encontrado',
            user_email: userMap[w.user_id]?.email || '-',
            balance: w.balance || 0,
            created_date: w.created_date,
            updated_date: w.updated_date
        })).sort((a, b) => b.balance - a.balance); // Ordena por saldo decrescente

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