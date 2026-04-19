import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let body = {};
        try {
            body = await req.json();
        } catch (_) {
            return Response.json({ error: 'Body JSON inválido' }, { status: 400 });
        }
        
        const { entity_name, method, params, caller_email } = body;
        
        if (!entity_name || !method) {
            return Response.json({ error: 'entity_name e method são obrigatórios' }, { status: 400 });
        }
        
        // SEGURANÇA: Valida se o caller é admin
        let isAuthorized = false;
        
        // Tenta auth da plataforma primeiro
        try {
            const user = await base44.auth.me();
            if (user && user.role === 'admin') {
                isAuthorized = true;
            }
        } catch (_) {
            // Plataforma auth pode falhar no site publicado
        }
        
        // Se não autorizou pela plataforma, verifica pelo caller_email (login custom AppUser)
        if (!isAuthorized && caller_email) {
            const appUsers = await base44.asServiceRole.entities.AppUser.filter({ email: caller_email });
            if (appUsers && appUsers.length > 0 && appUsers[0].role === 'admin') {
                isAuthorized = true;
            }
        }
        
        if (!isAuthorized) {
            return Response.json({ error: 'Não autorizado - apenas admin' }, { status: 403 });
        }
        
        // Executa a query usando asServiceRole (ignora RLS)
        const entity = base44.asServiceRole.entities[entity_name];
        if (!entity) {
            return Response.json({ error: `Entidade '${entity_name}' não encontrada` }, { status: 404 });
        }
        
        let result;
        
        if (method === 'list') {
            const sortBy = params?.sort_by || '-created_date';
            const limit = params?.limit || 500;
            result = await entity.list(sortBy, limit);
        } else if (method === 'filter') {
            const filterQuery = params?.filter || {};
            const sortBy = params?.sort_by || '-created_date';
            const limit = params?.limit || 500;
            result = await entity.filter(filterQuery, sortBy, limit);
        } else {
            return Response.json({ error: `Método '${method}' não suportado. Use 'list' ou 'filter'` }, { status: 400 });
        }
        
        return Response.json({ data: result || [] });
    } catch (error) {
        console.error('adminDataProxy error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});