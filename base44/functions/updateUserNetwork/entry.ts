import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * updateUserNetwork.ts
 *
 * Edge Function segura para atualizar informações críticas da rede de
 * afiliados de um usuário (ex: referred_by_id, status de licenciamento).
 * O Frontend deve chamar esta função em vez de fazer AppUser.update()
 * diretamente, pois atualizações diretas de frontend abrem margem
 * para sequestro de rede.
 *
 * Validações obrigatórias:
 * - Usuário autenticado
 * - Usuário tem papel de 'admin' ou é o próprio usuário atualizando dados leves
 */
Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    try {
        const base44 = createClientFromRequest(req);

        // 🔐 1. VERIFICAR AUTENTICAÇÃO
        const caller = await base44.auth.me();
        if (!caller) {
            console.error('🚫 [NETWORK UPDATE] Tentativa de alterar rede sem autenticação!');
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // 🔐 2. VERIFICAR PERMISSÃO DE ADMIN
        const callerUsers = await base44.asServiceRole.entities.AppUser.filter({ id: caller.id });
        const callerData = callerUsers?.[0];

        if (!callerData || callerData.role !== 'admin') {
            console.error(`🚫 [NETWORK UPDATE] Usuário ${caller.id} tentou alterar rede sem permissão de admin!`);
            return Response.json({ error: 'Permissão negada. Apenas administradores podem reestruturar a rede.' }, { status: 403 });
        }

        const { target_user_id, update_data } = await req.json();

        if (!target_user_id || !update_data) {
            return Response.json({ error: 'target_user_id e update_data são obrigatórios' }, { status: 400 });
        }

        // 🛡️ 3. FILTRAR CAMPOS PERMITIDOS (Apenas Admin pode editar esses)
        const allowedFields = [
            'referred_by_id',
            'partner_plan_status',
            'purchased_partner_plan',
            'career_levels',
            'primary_career_level',
            'display_first_name',
            'display_last_name',
            'commission_balance',
            'valora_pay_balance'
        ];

        const safeUpdateData: Record<string, any> = {};
        for (const [key, value] of Object.entries(update_data)) {
            if (allowedFields.includes(key) || key === 'referred_by_id') {
                safeUpdateData[key] = value;
            }
        }

        if (Object.keys(safeUpdateData).length === 0) {
            return Response.json({ error: 'Nenhum campo válido para atualização' }, { status: 400 });
        }

        console.log(`🔄 [NETWORK UPDATE] Admin ${caller.email} atualizando rede do usuário ${target_user_id}. Campos:`, Object.keys(safeUpdateData));

        // ✅ 4. ATUALIZAR USUÁRIO NO BANCO DE DADOS — Via ServiceRole
        await base44.asServiceRole.entities.AppUser.update(target_user_id, safeUpdateData);

        // ✅ 5. REGISTRAR LOG DE AUDITORIA
        await base44.asServiceRole.entities.SystemLog.create({
            entity_id: target_user_id,
            component_name: 'updateUserNetwork',
            step: 'NETWORK_RESTRUCTURE',
            status: 'success',
            message: `Rede do usuário alterada por Admin ${caller.email}. Padrinho alterado para: ${safeUpdateData.referred_by_id || 'null'}`
        });

        return Response.json({
            success: true,
            message: 'Rede do usuário atualizada com sucesso',
            updated_fields: Object.keys(safeUpdateData)
        });

    } catch (error) {
        console.error('❌ [NETWORK UPDATE] Erro fatal:', error);
        return Response.json({
            success: false,
            error: 'Erro interno ao processar atualização: ' + error.message
        }, { status: 500 });
    }
});
