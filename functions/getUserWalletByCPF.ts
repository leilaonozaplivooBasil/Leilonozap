import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { cpf } = await req.json();
        
        if (!cpf) {
            return Response.json({ error: 'CPF é obrigatório' }, { status: 400 });
        }

        const cleanCpf = cpf.replace(/\D/g, '');

        // Buscar usuário por CPF
        const users = await base44.asServiceRole.entities.AppUser.filter({ cpf: cleanCpf });
        
        if (!users || users.length === 0) {
            return Response.json({
                found: false,
                message: 'Usuário não encontrado com este CPF'
            });
        }

        const user = users[0];

        // Buscar wallet do usuário
        const wallets = await base44.asServiceRole.entities.Wallet.filter({ user_id: user.id });
        
        let totalBalance = 0;
        if (wallets && wallets.length > 0) {
            totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
        }

        return Response.json({
            found: true,
            user_id: user.id,
            user_name: user.full_name,
            user_email: user.email,
            cpf: cleanCpf,
            wallet_balance: totalBalance,
            wallet_records: wallets.length,
            created_date: user.created_date
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});