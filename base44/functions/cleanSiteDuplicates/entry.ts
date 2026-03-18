import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Validar autenticação ADMIN
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== 'admin') {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Acesso negado. Apenas administradores.' 
            }), { 
                status: 403,
                headers: { 'Content-Type': 'application/json' } 
            });
        }
        
        console.log("🧹 [CLEAN DUPLICATES] Iniciando limpeza...");
        
        // 🔧 CORREÇÃO: Buscar TODOS os usuários e filtrar manualmente
        const allUsers = await base44.asServiceRole.entities.AppUser.list("-created_date", 1000);
        
        console.log(`📊 [CLEAN DUPLICATES] Total de usuários no sistema: ${allUsers.length}`);
        
        // Filtrar manualmente por email E nome (mais robusto)
        const allSiteAccounts = allUsers.filter(u => {
            const emailMatch = u.email && u.email.toLowerCase().trim() === "site@leilaonozap.com";
            const nameMatch = u.full_name && u.full_name.includes("Site Oficial");
            return emailMatch || nameMatch;
        });
        
        console.log(`🔍 [CLEAN DUPLICATES] Encontrados ${allSiteAccounts.length} cadastros do Site Oficial:`);
        allSiteAccounts.forEach(acc => {
            console.log(`   - ID: ${acc.id}, Email: ${acc.email}, Nome: ${acc.full_name}, Criado: ${acc.created_date}`);
        });
        
        if (allSiteAccounts.length === 0) {
            console.log("⚠️ [CLEAN DUPLICATES] NENHUM Site Oficial encontrado!");
            
            // DEBUG: Mostrar alguns usuários para análise
            console.log("📋 [DEBUG] Primeiros 10 usuários no sistema:");
            allUsers.slice(0, 10).forEach(u => {
                console.log(`   - ${u.full_name} (${u.email})`);
            });
            
            return new Response(JSON.stringify({
                success: false,
                error: "Nenhum cadastro do Site Oficial encontrado.",
                debug: {
                    totalUsers: allUsers.length,
                    first10Users: allUsers.slice(0, 10).map(u => ({
                        name: u.full_name,
                        email: u.email
                    }))
                }
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (allSiteAccounts.length === 1) {
            console.log("✅ [CLEAN DUPLICATES] Apenas 1 Site Oficial existe. Perfeito!");
            return new Response(JSON.stringify({
                success: true,
                action: "already_clean",
                siteLicensee: allSiteAccounts[0],
                message: "Site Oficial já está único. ✅"
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // MÚLTIPLOS CADASTROS - LIMPAR!
        console.log(`⚠️ [CLEAN DUPLICATES] ${allSiteAccounts.length} duplicatas encontradas! Limpando...`);
        
        // Ordenar por data de criação (manter o MAIS ANTIGO)
        allSiteAccounts.sort((a, b) => {
            const dateA = new Date(a.created_date || 0).getTime();
            const dateB = new Date(b.created_date || 0).getTime();
            return dateA - dateB;
        });
        
        const [keepAccount, ...deleteAccounts] = allSiteAccounts;
        
        console.log(`✅ [KEEP] Mantendo: ${keepAccount.id} - ${keepAccount.full_name} (${keepAccount.created_date})`);
        console.log(`❌ [DELETE] Deletando ${deleteAccounts.length} duplicatas:`);
        
        const deletionResults = [];
        
        for (const duplicate of deleteAccounts) {
            try {
                console.log(`   🗑️ Deletando: ${duplicate.id} - ${duplicate.full_name} (${duplicate.created_date})`);
                await base44.asServiceRole.entities.AppUser.delete(duplicate.id);
                deletionResults.push({ 
                    id: duplicate.id, 
                    name: duplicate.full_name,
                    success: true, 
                    created_date: duplicate.created_date 
                });
                console.log(`   ✅ Deletado: ${duplicate.id}`);
            } catch (deleteError) {
                console.error(`   ❌ ERRO ao deletar ${duplicate.id}:`, deleteError);
                deletionResults.push({ 
                    id: duplicate.id, 
                    name: duplicate.full_name,
                    success: false, 
                    error: deleteError.message 
                });
            }
        }
        
        const successCount = deletionResults.filter(r => r.success).length;
        const failCount = deletionResults.filter(r => !r.success).length;
        
        console.log(`\n✅ [CLEAN DUPLICATES] CONCLUÍDO:`);
        console.log(`   ✅ Deletados: ${successCount}`);
        console.log(`   ❌ Falharam: ${failCount}`);
        console.log(`   🏆 Mantido: ${keepAccount.full_name} (${keepAccount.id})`);
        
        return new Response(JSON.stringify({
            success: true,
            action: "cleaned",
            siteLicensee: keepAccount,
            duplicatesRemoved: successCount,
            failedDeletions: failCount,
            deletionDetails: deletionResults,
            message: `✅ ${successCount} duplicatas removidas! ${failCount > 0 ? `(${failCount} falharam)` : ''}`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ [CLEAN DUPLICATES] ERRO CRÍTICO:', error);
        return new Response(JSON.stringify({ 
            success: false,
            error: error.message,
            stack: error.stack,
            details: error.toString()
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});