import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Não precisa autenticar - chave pública não é sensível
        const publicKey = Deno.env.get('MP_PUBLIC_KEY');
        
        if (!publicKey) {
            return Response.json({ 
                error: 'MP_PUBLIC_KEY não configurada' 
            }, { status: 500 });
        }
        
        return Response.json({ public_key: publicKey });
    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});