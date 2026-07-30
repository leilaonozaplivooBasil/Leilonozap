import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { payment_id } = await req.json();
        
        if (!payment_id) {
            return Response.json({ error: 'payment_id obrigatório' }, { status: 400 });
        }

        // Usa service role para contornar RLS
        const payments = await base44.asServiceRole.entities.AsaasPayment.filter(
            { payment_id: payment_id },
            null,
            1
        );

        if (payments && payments.length > 0) {
            const payment = payments[0];
            return Response.json({
                found: true,
                status: payment.status,
                value: payment.value,
                payment_date: payment.payment_date,
                is_wallet_deposit: payment.is_wallet_deposit
            });
        }

        // 🔎 Fallback: PIX gerado via Mercado Pago (depósito de carteira)
        const mpPayments = await base44.asServiceRole.entities.MercadoPagoPayment.filter(
            { payment_id: String(payment_id) },
            null,
            1
        );

        if (!mpPayments || mpPayments.length === 0) {
            return Response.json({ found: false, status: 'not_found' });
        }

        const mpPayment = mpPayments[0];
        return Response.json({
            found: true,
            status: mpPayment.status === 'approved' ? 'confirmed' : mpPayment.status,
            value: mpPayment.amount,
            is_wallet_deposit: mpPayment.deposit_type === 'digital_wallet'
        });

    } catch (error) {
        console.error('Erro checkPaymentStatus:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});