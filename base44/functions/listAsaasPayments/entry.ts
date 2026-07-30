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

        // Consulta TODOS os pagamentos no ASAAS via paginação, filtrando por status real
        // (RECEIVED = PIX confirmado, CONFIRMED = cartão confirmado) — não conta PENDING.
        let body = {};
        try { body = await req.json(); } catch (_) { /* sem body */ }
        const onlyReal = body.only_real !== false; // default: true
        const compact = body.compact === true;

        let allPayments = [];
        let offset = 0;
        const limitPerPage = 100;
        while (true) {
            const url = new URL('https://www.asaas.com/api/v3/payments');
            url.searchParams.set('limit', String(limitPerPage));
            url.searchParams.set('offset', String(offset));
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'access_token': ASAAS_API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`ASAAS API error: ${response.status} ${await response.text()}`);
            }
            const page = await response.json();
            allPayments = allPayments.concat(page.data || []);
            if (page.hasMore) {
                offset += limitPerPage;
            } else {
                break;
            }
            if (offset > 5000) break; // trava de segurança
        }

        const realStatuses = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];
        const filtered = onlyReal
            ? allPayments.filter((p) => realStatuses.includes(p.status))
            : allPayments;

        const mapped = filtered.map((p) => compact ? {
            id: p.id,
            status: p.status,
            billing_type: p.billingType,
            value: p.value,
            paymentDate: p.paymentDate,
            externalReference: p.externalReference
        } : p);

        const totalRealReais = filtered
            .filter((p) => realStatuses.includes(p.status))
            .reduce((sum, p) => sum + (p.value || 0), 0);

        return Response.json({
            success: true,
            asaas_total_geral: allPayments.length,
            asaas_total_filtrado: filtered.length,
            asaas_total_real_reais: totalRealReais,
            asaas_payments: mapped,
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