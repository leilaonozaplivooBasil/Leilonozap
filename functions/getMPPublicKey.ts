Deno.serve(async (req) => {
    try {
        const publicKey = Deno.env.get('MP_PUBLIC_KEY');
        
        if (!publicKey) {
            console.error('MP_PUBLIC_KEY não configurada');
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