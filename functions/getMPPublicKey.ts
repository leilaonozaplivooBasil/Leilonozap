import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const publicKey = Deno.env.get('MP_PUBLIC_KEY');
        
        if (!publicKey) {
            return Response.json({ error: 'Public key não configurada' }, { status: 500 });
        }

        return Response.json({ 
            success: true,
            public_key: publicKey.trim()
        });

    } catch (error) {
        console.error('Erro ao obter public key:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});