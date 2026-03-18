import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // 1. Validação de Admin
        if (!user || user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), { 
                status: 403, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        console.log("🧪 Iniciando reset de Valora Pay de TESTE...");

        // 2. Buscar TODOS os usuários
        const allUsers = await base44.asServiceRole.entities.AppUser.list("-created_date", 1000);
        
        if (!Array.isArray(allUsers)) {
            throw new Error("Falha ao buscar usuários do sistema");
        }

        console.log(`📊 Encontrados ${allUsers.length} usuários para processar.`);

        let updatedUsers = 0;
        let totalTestValora = 0;

        for (const appUser of allUsers) {
            try {
                const testBalance = appUser.test_valora_balance || 0;
                
                if (testBalance > 0) {
                    totalTestValora += testBalance;
                    
                    await base44.asServiceRole.entities.AppUser.update(appUser.id, {
                        test_valora_balance: 0
                    });
                    
                    updatedUsers++;
                    console.log(`✅ Zerado V$ ${testBalance.toFixed(2)} de teste de: ${appUser.full_name || appUser.email}`);
                }
            } catch (updateError) {
                console.error(`❌ Erro ao zerar ${appUser.full_name}:`, updateError);
            }
        }

        const summary = {
            message: `Reset concluído! ${updatedUsers} usuários tiveram saldo de teste zerado.`,
            usersReset: updatedUsers,
            totalUsers: allUsers.length,
            totalTestValoraZerado: totalTestValora.toFixed(2)
        };

        console.log("✅ Reset finalizado:", summary);

        return new Response(JSON.stringify(summary), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('❌ Erro na função resetTestValora:', error);
        return new Response(JSON.stringify({ 
            error: error.message,
            details: error.toString()
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});