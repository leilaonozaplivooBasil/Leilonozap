import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Apenas admins podem resetar saldos
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        console.log("🔄 Iniciando reset de saldos e comissões...");

        // Busca todos os usuários
        const allUsers = await base44.asServiceRole.entities.AppUser.list("-created_date", 5000);
        
        if (!Array.isArray(allUsers)) {
            throw new Error("Falha ao buscar usuários");
        }

        console.log(`📊 Total de usuários encontrados: ${allUsers.length}`);

        let updated = 0;
        const errors = [];

        // Atualiza cada usuário
        for (const userToUpdate of allUsers) {
            try {
                await base44.asServiceRole.entities.AppUser.update(userToUpdate.id, {
                    commission_balance: 0,
                    valora_pay_balance: 0,
                    network_bids_count: 0
                    // NÃO mexe em: referred_by_id, indicated_clients_count, referral_code
                });
                updated++;
                
                if (updated % 10 === 0) {
                    console.log(`✅ Progresso: ${updated}/${allUsers.length} usuários atualizados`);
                }
            } catch (error) {
                errors.push({ userId: userToUpdate.id, error: error.message });
                console.error(`❌ Erro ao atualizar usuário ${userToUpdate.id}:`, error);
            }
        }

        console.log(`✅ Reset concluído: ${updated} usuários atualizados`);
        
        if (errors.length > 0) {
            console.warn(`⚠️ ${errors.length} erros ocorreram durante o processo`);
        }

        return Response.json({
            success: true,
            message: `Reset de saldos concluído!`,
            totalUsers: allUsers.length,
            updated: updated,
            errors: errors.length
        });

    } catch (error) {
        console.error("❌ Erro ao resetar saldos:", error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});