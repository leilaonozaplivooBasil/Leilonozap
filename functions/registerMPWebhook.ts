import { MercadoPagoConfig } from 'npm:mercadopago@2.0.15';

Deno.serve(async (req) => {
    try {
        const accessToken = Deno.env.get('MP_ACCESS_TOKEN')?.trim();
        
        if (!accessToken) {
            return Response.json({ 
                error: 'MP_ACCESS_TOKEN não configurada'
            }, { status: 500 });
        }

        // Registrar webhook via API do Mercado Pago
        const webhookUrl = 'https://leilaonozap.net/api/apps/68d536db3c26ff51f79c4137/functions/mercadoPagoWebhook';
        
        const response = await fetch('https://api.mercadopago.com/v1/notifications/webhooks', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: webhookUrl,
                events: ['payment.created', 'payment.updated']
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Erro ao registrar webhook:', data);
            return Response.json({ 
                error: 'Erro ao registrar webhook no Mercado Pago',
                details: data
            }, { status: 400 });
        }

        console.log('✅ Webhook registrado com sucesso:', data);

        return Response.json({ 
            success: true,
            webhook_id: data.id,
            url: data.url,
            events: data.events
        });

    } catch (error) {
        console.error('❌ Erro crítico:', error.message);
        return Response.json({ 
            error: 'Erro ao processar webhook'
        }, { status: 500 });
    }
});