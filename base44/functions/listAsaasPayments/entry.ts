import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
        }

        const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
        if (!ASAAS_API_KEY) {
            return Response.json({ error: 'ASAAS_API_KEY not configured' }, { status: 500 });
        }

        // Consultar todos os pagamentos no ASAAS (últimos 100)
        const response = await fetch('https://www.asaas.com/api/v3/payments', {
            method: 'GET',
            headers: {
                'access_token': ASAAS_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`ASAAS API error: ${response.status} ${await response.text()}`);
        }

        const asaasData = await response.json();
        
        // Buscar nossos registros locais
        const localPayments = await base44.entities.AsaasPayment.list('-created_date', 100);

        // Comparar e retornar análise
        return Response.json({
            success: true,
            asaas_total: asaasData.totalCount || asaasData.data?.length || 0,
            asaas_payments: asaasData.data || [],
            local_total: localPayments.length,
            local_payments: localPayments,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro ao consultar ASAAS:', error.message);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});