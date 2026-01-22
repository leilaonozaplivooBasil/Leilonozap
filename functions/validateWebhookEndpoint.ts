import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin only' }, { status: 403 });
        }

        const appId = Deno.env.get('BASE44_APP_ID');
        
        // URL correta do webhook
        const webhookUrl = `https://leilaonozap.net/api/apps/${appId}/functions/mercadoPagoWebhook`;
        
        console.log('🔍 Validando endpoint do webhook');
        console.log(`   URL: ${webhookUrl}`);
        
        // Testa GET
        const getTest = await fetch(webhookUrl, { method: 'GET' });
        console.log(`   GET: ${getTest.status} ${getTest.statusText}`);
        
        // Testa OPTIONS
        const optionsTest = await fetch(webhookUrl, { method: 'OPTIONS' });
        console.log(`   OPTIONS: ${optionsTest.status} ${optionsTest.statusText}`);
        
        // Testa POST com payload vazio
        const postTest = await fetch(webhookUrl, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'test', type: 'test' })
        });
        console.log(`   POST: ${postTest.status} ${postTest.statusText}`);
        
        // Retorna resultado
        const allOk = getTest.ok && optionsTest.ok && postTest.ok;
        
        return Response.json({
            webhook_url: webhookUrl,
            status: allOk ? 'FUNCIONANDO' : 'PROBLEMA DETECTADO',
            tests: {
                get: { status: getTest.status, ok: getTest.ok },
                options: { status: optionsTest.status, ok: optionsTest.ok },
                post: { status: postTest.status, ok: postTest.ok }
            },
            instruction: allOk 
                ? 'Webhook está pronto. Configure essa URL no Mercado Pago.'
                : 'Webhook tem problema. Verifique os testes acima.'
        });

    } catch (error) {
        console.error('Erro ao validar webhook:', error);
        return Response.json({ 
            error: error.message,
            instruction: 'Erro ao testar webhook. Verifique logs.'
        }, { status: 500 });
    }
});