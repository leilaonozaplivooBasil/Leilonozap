import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const appId = Deno.env.get('BASE44_APP_ID');
        const domain = 'https://leilaonozap.net';
        const webhookUrl = `${domain}/api/apps/${appId}/functions/mercadoPagoWebhook`;

        return Response.json({
            webhook_url: webhookUrl,
            app_id: appId,
            domain: domain,
            instruction: 'Configure esta URL no painel do Mercado Pago'
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});