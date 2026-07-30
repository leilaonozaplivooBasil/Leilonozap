import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

// 🔎 Relatório de pagamentos REAIS do Mercado Pago (consulta direto na API do MP,
// não apenas os registros locais). Segue o modelo de auth CUSTOM do app
// (AppUser + localStorage) — NUNCA usar base44.auth.me() como gate aqui.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { admin_user_id, status, begin_date, end_date, limit, compact } = await req.json();

        if (!admin_user_id) {
            return Response.json({ error: 'admin_user_id é obrigatório' }, { status: 400 });
        }

        const admin = await base44.asServiceRole.entities.AppUser.get(admin_user_id);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            return Response.json({ error: 'Não autorizado - apenas admin' }, { status: 403 });
        }

        const accessToken = Deno.env.get('MP_ACCESS_TOKEN')?.trim();
        if (!accessToken) {
            return Response.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
        }

        // Busca os pagamentos direto na API do Mercado Pago (fonte real).
        // Suporta filtro por status (ex: approved) e por período (date_created).
        const params = new URLSearchParams({
            sort: 'date_created',
            criteria: 'desc',
            limit: String(limit || 100)
        });
        if (status) params.set('status', status);
        if (begin_date && end_date) {
            params.set('range', 'date_created');
            params.set('begin_date', begin_date);
            params.set('end_date', end_date);
        }

        const mpResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/search?${params.toString()}`,
            {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            }
        );

        const mpData = await mpResponse.json();

        if (!mpResponse.ok) {
            return Response.json({ error: mpData.message || 'Erro ao consultar Mercado Pago', details: mpData }, { status: 400 });
        }

        const payments = (mpData.results || []).map((p) => compact ? {
            id: p.id,
            status: p.status,
            amount: p.transaction_amount,
            date_approved: p.date_approved
        } : {
            id: p.id,
            status: p.status,
            status_detail: p.status_detail,
            live_mode: p.live_mode,
            amount: p.transaction_amount,
            payment_method: p.payment_method_id,
            payer_email: p.payer?.email,
            external_reference: p.external_reference,
            date_created: p.date_created,
            date_approved: p.date_approved
        });

        const totalApproved = payments
            .filter((p) => p.status === 'approved')
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        return Response.json({
            success: true,
            total_encontrado: mpData.paging?.total ?? payments.length,
            total_aprovado_reais: totalApproved,
            pagamentos: payments
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});