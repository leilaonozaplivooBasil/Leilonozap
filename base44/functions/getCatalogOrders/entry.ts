import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verifica autenticação - tenta auth da plataforma primeiro
        let isAuthorized = false;
        
        try {
            const user = await base44.auth.me();
            if (user && user.role === 'admin') {
                isAuthorized = true;
            }
        } catch (_) {
            // Plataforma auth pode falhar no site publicado
        }
        
        // Se não autorizou pela plataforma, verifica pelo payload (email do AppUser)
        if (!isAuthorized) {
            let body = {};
            try {
                body = await req.json();
            } catch (_) {}
            
            const callerEmail = body.caller_email;
            if (!callerEmail) {
                return Response.json({ error: 'Não autorizado' }, { status: 403 });
            }
            
            // Verifica se o email corresponde a um admin no AppUser
            const appUsers = await base44.asServiceRole.entities.AppUser.filter({ email: callerEmail });
            if (!appUsers || appUsers.length === 0 || appUsers[0].role !== 'admin') {
                return Response.json({ error: 'Não autorizado - role insuficiente' }, { status: 403 });
            }
            
            isAuthorized = true;
        }
        
        if (!isAuthorized) {
            return Response.json({ error: 'Não autorizado' }, { status: 403 });
        }
        
        // Busca todos os pedidos usando service role (ignora RLS)
        const orders = await base44.asServiceRole.entities.CatalogSale.list('-created_date', 500);
        
        return Response.json({ orders: orders || [] });
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});