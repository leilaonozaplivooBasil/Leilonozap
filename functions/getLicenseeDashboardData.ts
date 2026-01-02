import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // 1. Validação de Admin
        if (!user || user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        // 2. Usar o Service Role para buscar todos os usuários
        const { data: allUsers, error: usersError } = await base44.asServiceRole.entities.AppUser.list("-created_date", 500);
        if (usersError) throw usersError;
        
        // 3. Filtrar apenas os licenciados
        const licensees = allUsers.filter(u => u.role === 'licensee');

        // 4. Para cada licenciado, buscar suas estatísticas
        const enrichedLicensees = await Promise.all(licensees.map(async (licensee) => {
            let indicated_clients_count = 0;
            let network_bids_count = 0;

            try {
                // Busca os usuários que ele indicou
                const { data: indicatedUsers, error: indicatedError } = await base44.asServiceRole.entities.AppUser.filter({ referred_by_id: licensee.id });
                if(indicatedError) throw indicatedError;

                indicated_clients_count = indicatedUsers.length;

                // Se houver indicados, busca os arremates deles
                if (indicated_clients_count > 0) {
                    const indicatedUserIds = indicatedUsers.map(u => u.id);
                    const { data: wonAuctions, error: auctionError } = await base44.asServiceRole.entities.Auction.filter({
                        status: { $in: ["ended", "sold"] },
                        winner_id: { $in: indicatedUserIds }
                    });
                    if(auctionError) throw auctionError;
                    network_bids_count = wonAuctions.length;
                }
            } catch (statError) {
                console.error(`Falha ao buscar estatísticas para o licenciado ${licensee.id}:`, statError);
            }

            return {
                ...licensee,
                indicated_clients_count,
                network_bids_count,
            };
        }));
        
        // Retorna a lista de licenciados com as estatísticas calculadas
        return new Response(JSON.stringify(enrichedLicensees), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Erro na função getLicenseeDashboardData:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});