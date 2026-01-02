import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        console.log("🏢 [SITE LICENSEE] Iniciando verificação...");
        
        // Buscar TODOS os cadastros do Site Oficial
        const allSiteAccounts = await base44.asServiceRole.entities.AppUser.filter({ 
            email: "site@leilaonozap.com" 
        });
        
        console.log(`🔍 [SITE LICENSEE] Encontrados ${allSiteAccounts.length} cadastros do Site Oficial`);
        
        if (allSiteAccounts.length === 0) {
            // Não existe - criar o primeiro e único
            console.log("🆕 [SITE LICENSEE] Criando Site Oficial pela primeira vez...");
            
            const siteLicensee = await base44.asServiceRole.entities.AppUser.create({
                full_name: "Leilão NoZap - Site Oficial",
                nickname: "Site Oficial",
                email: "site@leilaonozap.com",
                password: "SITE_ADMIN_2025_SECURE_" + Date.now(),
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
            
            console.log(`✅ [SITE LICENSEE] Criado com ID: ${siteLicensee.id}`);
            
            return new Response(JSON.stringify({
                success: true,
                action: "created",
                siteLicensee: siteLicensee,
                message: "Site Oficial criado com sucesso"
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (allSiteAccounts.length === 1) {
            // Perfeito - existe apenas 1
            console.log("✅ [SITE LICENSEE] Site Oficial já existe e é único!");
            
            return new Response(JSON.stringify({
                success: true,
                action: "found",
                siteLicensee: allSiteAccounts[0],
                message: "Site Oficial encontrado (único)"
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // PROBLEMA: Múltiplos cadastros duplicados
        console.log("⚠️ [SITE LICENSEE] DUPLICADOS ENCONTRADOS! Limpando...");
        
        // Ordenar por data de criação (manter o mais antigo)
        allSiteAccounts.sort((a, b) => {
            const dateA = new Date(a.created_date || 0).getTime();
            const dateB = new Date(b.created_date || 0).getTime();
            return dateA - dateB;
        });
        
        const [keepAccount, ...deleteAccounts] = allSiteAccounts;
        
        console.log(`✅ [SITE LICENSEE] Mantendo: ${keepAccount.id} (criado em ${keepAccount.created_date})`);
        
        let deletedCount = 0;
        for (const duplicate of deleteAccounts) {
            try {
                console.log(`❌ [SITE LICENSEE] Deletando duplicata: ${duplicate.id} (criado em ${duplicate.created_date})`);
                await base44.asServiceRole.entities.AppUser.delete(duplicate.id);
                deletedCount++;
            } catch (deleteError) {
                console.error(`❌ Erro ao deletar ${duplicate.id}:`, deleteError);
            }
        }
        
        console.log(`✅ [SITE LICENSEE] Limpeza concluída: ${deletedCount} duplicatas removidas`);
        
        return new Response(JSON.stringify({
            success: true,
            action: "cleaned",
            siteLicensee: keepAccount,
            duplicatesRemoved: deletedCount,
            message: `Site Oficial limpo: ${deletedCount} duplicatas removidas`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ [SITE LICENSEE] Erro:', error);
        return new Response(JSON.stringify({ 
            success: false,
            error: error.message,
            details: error.toString()
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});