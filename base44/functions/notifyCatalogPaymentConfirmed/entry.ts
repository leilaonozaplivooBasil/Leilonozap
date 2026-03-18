import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { catalog_sale_id, buyer_id, buyer_email, product_title, amount } = await req.json();

        console.log('📢 Notificando pagamento confirmado:', {
            catalog_sale_id,
            buyer_email,
            product_title
        });

        // ✅ Registrar notificação para o usuário ver em tempo real
        const notification = {
            user_id: buyer_id,
            type: 'payment_confirmed',
            title: '✅ Pagamento Confirmado',
            message: `Seu pagamento de R$ ${amount.toFixed(2)} para "${product_title}" foi confirmado!`,
            catalog_sale_id: catalog_sale_id,
            read: false,
            created_at: new Date().toISOString()
        };

        // Armazenar em localStorage via push para o cliente
        // Usar SystemLog como meio de notificação para queries em tempo real
        await base44.entities.SystemLog.create({
            step: 'USER_NOTIFICATION',
            status: 'info',
            message: notification.title,
            component_name: 'notifyCatalogPaymentConfirmed',
            entity_id: catalog_sale_id,
            payload: {
                user_id: buyer_id,
                notification_type: 'payment_confirmed',
                product_title: product_title,
                amount: amount
            }
        });

        console.log('✅ Notificação registrada');

        return Response.json({ success: true });

    } catch (error) {
        console.error('❌ Erro ao notificar:', error.message);
        return Response.json(
            { error: error.message },
            { status: 500 }
        );
    }
});