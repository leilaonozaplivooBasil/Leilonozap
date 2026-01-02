import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // 1. Validação de Admin
        if (!user || user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        console.log("Iniciando Sincronização Forçada de Estatísticas...");

        // 2. Usar o Service Role para buscar todos os usuários
        const allUsers = await base44.asServiceRole.entities.AppUser.list("-created_date", 1000);
        
        // CORREÇÃO: Garante que `allUsers` seja um array antes de continuar.
        if (!Array.isArray(allUsers)) {
             console.warn("A busca por usuários não retornou um array. Interrompendo a sincronização.");
             return new Response(JSON.stringify({ message: "Nenhum usuário encontrado para sincronizar." }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // 3. Filtrar apenas os licenciados
        const licensees = allUsers.filter(u => u.role === 'licensee');
        console.log(`Encontrados ${licensees.length} licenciados para processar.`);

        let updatedCount = 0;

        // 4. Para cada licenciado, recalcular e ATUALIZAR os dados no banco
        for (const licensee of licensees) {
            try {
                // CALCULAR INDICADOS
                const indicatedUsers = await base44.asServiceRole.entities.AppUser.filter({ referred_by_id: licensee.id });
                const indicated_clients_count = Array.isArray(indicatedUsers) ? indicatedUsers.length : 0;

                // CALCULAR ARREMATES DA REDE
                let network_bids_count = 0;
                if (indicated_clients_count > 0) {
                    const indicatedUserIds = (indicatedUsers || []).map(u => u.id).filter(Boolean);
                    if (indicatedUserIds.length > 0) {
                        const wonAuctions = await base44.asServiceRole.entities.Auction.filter({
                            status: { $in: ["ended", "sold"] },
                            winner_id: { $in: indicatedUserIds }
                        });
                        network_bids_count = Array.isArray(wonAuctions) ? wonAuctions.length : 0;
                    }
                }

                // ATUALIZAR O REGISTRO NO BANCO DE DADOS
                await base44.asServiceRole.entities.AppUser.update(licensee.id, {
                    indicated_clients_count,
                    network_bids_count,
                });
                
                updatedCount++;
                console.log(`- Licenciado ${licensee.full_name} (${licensee.id}) atualizado: ${indicated_clients_count} indicados, ${network_bids_count} arremates.`);

            } catch (statError) {
                console.error(`Falha ao processar o licenciado ${licensee.id}:`, statError);
            }
        }
        
        const summary = `Sincronização concluída. ${updatedCount} de ${licensees.length} licenciados foram atualizados.`;
        console.log(summary);

        return new Response(JSON.stringify({ message: summary }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Erro na função forceSyncStats:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});