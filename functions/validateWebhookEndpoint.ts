import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin only' }, { status: 403 });
        }

        const appId = Deno.env.get('BASE44_APP_ID');
        const webhookUrl = `https://leilaonozap.net/api/apps/${appId}/functions/mercadoPagoWebhook`;
        
        // Testa em PARALELO, não em série
        const [getTest, optionsTest, postTest] = await Promise.all([
            fetch(webhookUrl, { method: 'GET' }),
            fetch(webhookUrl, { method: 'OPTIONS' }),
            fetch(webhookUrl, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'test', type: 'test' })
            })
        ]);
        
        const allOk = getTest.ok && optionsTest.ok && postTest.ok;
        
        return Response.json({
            webhook_url: webhookUrl,
            status: allOk ? 'FUNCIONANDO' : 'PROBLEMA DETECTADO',
            tests: {
                get: { status: getTest.status, ok: getTest.ok },
                options: { status: optionsTest.status, ok: optionsTest.ok },
                post: { status: postTest.status, ok: postTest.ok }
            }
        });

    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});