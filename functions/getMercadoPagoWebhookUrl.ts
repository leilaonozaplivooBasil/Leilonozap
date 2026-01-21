Deno.serve(async (req) => {
    try {
        const appId = Deno.env.get('BASE44_APP_ID');
        const domain = 'leilaonozap.net';
        
        if (!appId) {
            return Response.json({ 
                error: 'BASE44_APP_ID não configurado',
                hint: 'Verifique as variáveis de ambiente do projeto'
            }, { status: 500 });
        }

        const webhookUrl = `https://${domain}/api/apps/${appId}/functions/mercadoPagoWebhook`;
        
        return Response.json({ 
            app_id: appId,
            domain: domain,
            webhook_url: webhookUrl,
            instruction: 'Cole esta URL no Mercado Pago em: Configuración > Notificaciones webhooks'
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});