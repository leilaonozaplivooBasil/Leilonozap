import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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

        // 🛡️ SOMA todos os saldos — NUNCA deleta carteiras em hot-path de leitura.
        // A consolidação de duplicatas (se necessária) é tarefa admin separada,
        // nunca dentro de getDigitalWalletBalance (causa race com débitos concorrentes).
        const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

        return Response.json({ balance: totalBalance, wallet_id: wallets[0].id });

    } catch (error) {
        console.error('Erro getDigitalWalletBalance:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});