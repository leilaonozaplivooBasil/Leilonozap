Deno.serve(async (req) => {
    const appId = Deno.env.get('BASE44_APP_ID');
    
    if (!appId) {
        return new Response('APP_ID não encontrado', { status: 500 });
    }

    const webhookUrl = `https://leilaonozap.net/api/apps/${appId}/functions/mercadoPagoWebhook`;

    return new Response(`
APP_ID: ${appId}

WEBHOOK URL COMPLETA:
${webhookUrl}

Cole essa URL no Mercado Pago em: Configuración > Notificaciones webhooks > Pagar
    `, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
});