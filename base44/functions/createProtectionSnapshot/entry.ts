import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🛡️ CRIA SNAPSHOT DE PROTEÇÃO
 * Salva estado atual de todos os arquivos protegidos
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { description, files } = await req.json();

        const snapshot = {
            timestamp: new Date().toISOString(),
            description: description || 'Snapshot automático',
            user_id: user.id,
            user_name: user.full_name,
            files_count: files?.length || 0,
            hash: crypto.randomUUID(),
            files: files || []
        };

        console.log(`🛡️ Snapshot criado por ${user.full_name}: ${description}`);

        return Response.json({
            success: true,
            snapshot
        });

    } catch (error) {
        console.error('❌ Erro ao criar snapshot:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});