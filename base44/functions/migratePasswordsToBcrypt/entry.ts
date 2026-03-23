import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);

    // Proteção: apenas admin pode executar
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = { migrated: 0, skipped: 0, errors: [] };

    // Busca todos os AppUsers em lotes
    const allUsers = await base44.asServiceRole.entities.AppUser.list('-created_date', 5000);

    for (const appUser of allUsers) {
        // Sem senha → pula
        if (!appUser.password) {
            results.skipped++;
            continue;
        }

        // Já é bcrypt → pula
        if (appUser.password.startsWith('$2b$') || appUser.password.startsWith('$2a$')) {
            results.skipped++;
            continue;
        }

        // Texto puro → migra para bcrypt
        try {
            const hash = await bcrypt.hash(appUser.password, 10);
            await base44.asServiceRole.entities.AppUser.update(appUser.id, { password: hash });
            results.migrated++;
            console.log(`✅ Migrado: ${appUser.email}`);
        } catch (err) {
            results.errors.push({ email: appUser.email, error: err.message });
            console.error(`❌ Erro ao migrar ${appUser.email}:`, err.message);
        }
    }

    console.log(`📊 Resultado: migrated=${results.migrated}, skipped=${results.skipped}, errors=${results.errors.length}`);

    return Response.json(results);
});