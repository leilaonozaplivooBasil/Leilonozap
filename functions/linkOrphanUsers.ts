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

        console.log("🔗 Iniciando vinculação de usuários órfãos...");

        // 2. Buscar ou criar "Licenciado Site"
        let siteLicensee = null;
        const siteLicensees = await base44.asServiceRole.entities.AppUser.filter({ 
            email: "site@leilaonozap.com" 
        });

        if (siteLicensees.length > 0) {
            siteLicensee = siteLicensees[0];
            console.log(`✅ Licenciado Site encontrado: ${siteLicensee.id}`);
        } else {
            console.log("🏗️ Criando Licenciado Site...");
            
            siteLicensee = await base44.asServiceRole.entities.AppUser.create({
                full_name: "Leilão NoZap - Site Oficial",
                nickname: "Site Oficial",
                email: "site@leilaonozap.com",
                password: "SITE_ADMIN_2025_SECURE",
                phone: "(21) 00000-0000",
                role: "licensee",
                referral_code: "SITE2025",
                terms_accepted: true,
                avatar_color: "#22c55e",
                points: 0,
                total_bids: 0,
                won_auctions: 0,
                valora_pay_balance: 0,
                commission_balance: 0,
                indicated_clients_count: 0,
                network_bids_count: 0,
                career_levels: ["licenciado_aplicativo"],
                primary_career_level: "licenciado_aplicativo"
            });
            
            console.log(`✅ Licenciado Site criado: ${siteLicensee.id}`);
        }

        // 3. Buscar TODOS os usuários órfãos (sem indicação)
        const allUsers = await base44.asServiceRole.entities.AppUser.list("-created_date", 1000);
        
        const orphanUsers = allUsers.filter(u => 
            !u.referred_by_id && 
            u.id !== siteLicensee.id && 
            u.role !== 'admin'
        );

        console.log(`🔍 Encontrados ${orphanUsers.length} usuários órfãos`);

        // 4. Vincular todos ao Licenciado Site
        let linkedCount = 0;
        for (const orphan of orphanUsers) {
            try {
                await base44.asServiceRole.entities.AppUser.update(orphan.id, {
                    referred_by_id: siteLicensee.id
                });
                linkedCount++;
                console.log(`✅ Vinculado: ${orphan.full_name} (${orphan.email})`);
            } catch (error) {
                console.error(`❌ Erro ao vincular ${orphan.id}:`, error);
            }
        }

        const summary = {
            success: true,
            siteLicenseeId: siteLicensee.id,
            siteLicenseeName: siteLicensee.full_name,
            totalOrphans: orphanUsers.length,
            linkedCount: linkedCount,
            message: `${linkedCount} de ${orphanUsers.length} usuários vinculados ao Licenciado Site!`
        };

        console.log("✅ Processo concluído:", summary);

        return new Response(JSON.stringify(summary), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('❌ Erro na função linkOrphanUsers:', error);
        return new Response(JSON.stringify({ 
            success: false,
            error: error.message 
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});