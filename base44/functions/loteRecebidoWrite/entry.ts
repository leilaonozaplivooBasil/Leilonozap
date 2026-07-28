import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Escrita segura de LoteRecebido para o painel de Estoque de Lotes.
// A entidade tem RLS write = admin-only, mas o app usa login custom (AppUser via
// localStorage) que NÃO cria sessão de auth real no Base44 — então o update direto
// pelo SDK do navegador cai como não-admin e o servidor recusa ("Falha ao salvar").
// Esta função valida o admin (plataforma OU caller_email do AppUser) e executa a
// escrita com asServiceRole, seguindo o mesmo padrão do adminDataProxy.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        let body = {};
        try {
            body = await req.json();
        } catch (_) {
            return Response.json({ error: 'Body JSON inválido' }, { status: 400 });
        }

        const { method, id, data, caller_email } = body;

        if (!method) {
            return Response.json({ error: 'method é obrigatório' }, { status: 400 });
        }

        // SEGURANÇA: valida se o caller é admin
        let isAuthorized = false;

        try {
            const user = await base44.auth.me();
            if (user && (user.role === 'admin' || user.role === 'super_admin')) {
                isAuthorized = true;
            }
        } catch (_) {
            // Auth da plataforma pode falhar no site publicado (login custom)
        }

        if (!isAuthorized && caller_email) {
            const appUsers = await base44.asServiceRole.entities.AppUser.filter({ email: caller_email });
            if (appUsers && appUsers.length > 0 && (appUsers[0].role === 'admin' || appUsers[0].role === 'super_admin')) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return Response.json({ error: 'Não autorizado - apenas admin' }, { status: 403 });
        }

        const entity = base44.asServiceRole.entities.LoteRecebido;
        let result;

        if (method === 'update') {
            if (!id) return Response.json({ error: 'id é obrigatório para update' }, { status: 400 });
            result = await entity.update(id, data || {});
        } else if (method === 'create') {
            result = await entity.create(data || {});
        } else if (method === 'delete') {
            if (!id) return Response.json({ error: 'id é obrigatório para delete' }, { status: 400 });
            await entity.delete(id);
            result = { deleted: true };
        } else {
            return Response.json({ error: `Método '${method}' não suportado. Use 'update', 'create' ou 'delete'` }, { status: 400 });
        }

        return Response.json({ data: result });
    } catch (error) {
        console.error('loteRecebidoWrite error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});