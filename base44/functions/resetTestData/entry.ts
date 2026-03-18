import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

        console.log("🧹 Iniciando limpeza de dados de teste...");

        // 2. Buscar TODOS os licenciados usando .list() que é mais confiável
        const allUsers = await base44.asServiceRole.entities.AppUser.list("-created_date", 1000);
        
        if (!Array.isArray(allUsers)) {
            throw new Error("Falha ao buscar usuários do sistema");
        }

        // Filtrar licenciados E admins com código de indicação
        const licensees = allUsers.filter(u => u.role === 'licensee' || (u.role === 'admin' && u.referral_code));
        console.log(`📊 Encontrados ${licensees.length} licenciados para zerar.`);

        let updatedLicensees = 0;
        for (const licensee of licensees) {
            try {
                await base44.asServiceRole.entities.AppUser.update(licensee.id, {
                    indicated_clients_count: 0,
                    network_bids_count: 0,
                    commission_balance: 0,
                    valora_pay_balance: 0,
                    test_valora_balance: 0
                });
                updatedLicensees++;
                console.log(`✅ Zerado: ${licensee.full_name || licensee.email}`);
            } catch (updateError) {
                console.error(`❌ Erro ao zerar ${licensee.full_name}:`, updateError);
            }
        }

        const summary = {
            message: `Limpeza concluída! ${updatedLicensees} de ${licensees.length} licenciados zerados.`,
            licenseesReset: updatedLicensees,
            totalLicensees: licensees.length
        };

        console.log("✅ Limpeza finalizada:", summary);

        return new Response(JSON.stringify(summary), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('❌ Erro na função resetTestData:', error);
        return new Response(JSON.stringify({ 
            error: error.message,
            details: error.toString()
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});