import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { MercadoPagoConfig, Preference } from 'npm:mercadopago@2.0.15';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin required' }, { status: 403 });
        }

        // Lê credenciais DIRETO do ambiente
        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        const publicKey = Deno.env.get('MP_PUBLIC_KEY');

        console.log('🔍 DIAGNÓSTICO MP:');
        console.log('Token presente:', !!accessToken);
        console.log('Token tipo:', accessToken ? accessToken.substring(0, 10) + '...' : 'AUSENTE');
        console.log('Public Key presente:', !!publicKey);

        if (!accessToken || !publicKey) {
            return Response.json({
                error: 'Credenciais não configuradas',
                has_token: !!accessToken,
                has_key: !!publicKey
            }, { status: 500 });
        }

        // Testa criação de preferência MÍNIMA
        const client = new MercadoPagoConfig({ accessToken });
        const preference = new Preference(client);

        const testPreference = {
            items: [{
                id: 'test',
                title: 'Teste de Validação',
                quantity: 1,
                currency_id: 'BRL',
                unit_price: 0.01
            }],
            external_reference: `VALIDATION_${Date.now()}`
        };

        const result = await preference.create({ body: testPreference });

        console.log('✅ Preferência criada:', result.id);
        console.log('Tipo:', result.id.includes('test') ? '⚠️ TESTE' : '✅ PRODUÇÃO');

        return Response.json({
            success: true,
            preference_id: result.id,
            is_production: !result.id.includes('test'),
            token_prefix: accessToken.substring(0, 10),
            message: result.id.includes('test') 
                ? '⚠️ ALERTA: Token está gerando preferências de TESTE!' 
                : '✅ Token está correto (produção)'
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
        return Response.json({ 
            error: error.message,
            details: error.cause || error.stack
        }, { status: 500 });
    }
});