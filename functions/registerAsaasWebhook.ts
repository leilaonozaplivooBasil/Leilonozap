import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Apenas admin pode registrar webhook
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const apiKey = Deno.env.get('ASAAS_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'ASAAS não configurado' }, { status: 500 });
        }

        const webhookUrl = `${new URL(req.url).origin}/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/asaasWebhook`;
        
        console.log('📝 Registrando webhook ASAAS:', webhookUrl);

        // Buscar webhooks existentes
        const listResponse = await fetch('https://api.asaas.com/v3/webhooks', {
            headers: {
                'access_token': apiKey,
                'Content-Type': 'application/json'
            }
        });

        const listData = await listResponse.json();
        const existingWebhook = listData.data?.find(w => w.url === webhookUrl);

        if (existingWebhook) {
            console.log('✅ Webhook já registrado:', existingWebhook.id);
            return Response.json({ 
                success: true, 
                webhook_id: existingWebhook.id,
                message: 'Webhook já estava registrado'
            });
        }

        // Registrar novo webhook
        const registerResponse = await fetch('https://api.asaas.com/v3/webhooks', {
            method: 'POST',
            headers: {
                'access_token': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: webhookUrl,
                events: [
                    'PAYMENT_CONFIRMED',
                    'PAYMENT_RECEIVED',
                    'PAYMENT_FAILED',
                    'PAYMENT_PENDING'
                ]
            })
        });

        const registerData = await registerResponse.json();

        if (registerData.errors) {
            console.error('❌ Erro ao registrar webhook:', registerData.errors);
            return Response.json({ 
                error: 'Erro ao registrar webhook ASAAS', 
                details: registerData.errors 
            }, { status: 400 });
        }

        console.log('✅ Webhook registrado com sucesso:', registerData.id);

        return Response.json({
            success: true,
            webhook_id: registerData.id,
            url: webhookUrl,
            events: ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'PAYMENT_PENDING']
        });

    } catch (error) {
        console.error('❌ Erro ao registrar webhook:', error.message);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});