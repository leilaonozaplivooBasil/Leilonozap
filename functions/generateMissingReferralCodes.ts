import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Apenas admins podem executar
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Busca todos os usuários sem referral_code
        const allUsers = await base44.asServiceRole.entities.AppUser.filter({});
        const usersWithoutCode = allUsers.filter(u => !u.referral_code);

        console.log(`📊 Total de usuários: ${allUsers.length}`);
        console.log(`⚠️ Usuários sem referral_code: ${usersWithoutCode.length}`);

        const generateReferralCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < 8; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        };

        const results = [];
        const errors = [];

        for (const u of usersWithoutCode) {
            try {
                const newCode = generateReferralCode();
                
                await base44.asServiceRole.entities.AppUser.update(u.id, {
                    referral_code: newCode
                });

                results.push({
                    id: u.id,
                    name: u.full_name,
                    email: u.email,
                    new_code: newCode
                });

                console.log(`✅ ${u.full_name} → ${newCode}`);
            } catch (err) {
                errors.push({
                    id: u.id,
                    name: u.full_name,
                    error: err.message
                });
                console.error(`❌ Erro ao atualizar ${u.full_name}:`, err.message);
            }
        }

        return Response.json({
            success: true,
            total_users: allUsers.length,
            users_without_code: usersWithoutCode.length,
            updated: results.length,
            errors: errors.length,
            results,
            errors_details: errors
        });

    } catch (error) {
        console.error('❌ Erro geral:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});