import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Responder imediatamente para o MP
        const body = await req.json();
        console.log('📥 Webhook recebido:', JSON.stringify(body, null, 2));

        // Processar em background
        (async () => {
            try {
                const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
                if (!accessToken) {
                    console.error('❌ MP_ACCESS_TOKEN não configurado');
                    return;
                }

                // MP envia notificações de payment e merchant_order
                if (body.type === 'payment') {
                    const paymentId = body.data.id;

                    // Buscar detalhes do pagamento
                    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                        headers: {
                            'Authorization': `Bearer ${accessToken.trim()}`
                        }
                    });

                    const payment = await response.json();
                    console.log('💳 Detalhes do pagamento:', JSON.stringify(payment, null, 2));

                    // Buscar registro no banco pela external_reference
                    const externalRef = payment.external_reference;
                    if (!externalRef) {
                        console.log('⚠️ Pagamento sem external_reference');
                        return;
                    }

                    const payments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({
                        external_reference: externalRef
                    });

                    if (payments.length > 0) {
                        const dbPayment = payments[0];

                        // Atualizar status
                        await base44.asServiceRole.entities.MercadoPagoPayment.update(dbPayment.id, {
                            payment_id: String(paymentId),
                            status: payment.status,
                            payment_method: payment.payment_type_id || payment.payment_method_id
                        });

                        console.log(`✅ Status atualizado: ${payment.status}`);

                        // Se aprovado, marcar leilão como pago
                        if (payment.status === 'approved') {
                            if (dbPayment.auction_id) {
                                await base44.asServiceRole.entities.Auction.update(dbPayment.auction_id, {
                                    order_status: 'paid'
                                });
                                console.log(`💰 Leilão ${dbPayment.auction_id} marcado como pago`);
                            }
                            if (dbPayment.catalog_sale_id) {
                                await base44.asServiceRole.entities.CatalogSale.update(dbPayment.catalog_sale_id, {
                                    status: 'paid'
                                });
                                console.log(`🛒 CatalogSale ${dbPayment.catalog_sale_id} marcada como paga`);
                            }
                        }
                    } else {
                        console.log('⚠️ Pagamento não encontrado no banco:', externalRef);
                    }
                }

                // Salvar log do webhook
                await base44.asServiceRole.entities.WebhookLog.create({
                    source: 'mercadopago',
                    event_type: body.type,
                    payload: body,
                    processed: true
                });

            } catch (error) {
                console.error('❌ Erro ao processar webhook:', error);
                
                // Salvar erro no log
                try {
                    await base44.asServiceRole.entities.WebhookLog.create({
                        source: 'mercadopago',
                        event_type: body.type,
                        payload: body,
                        processed: false,
                        error_message: error.message
                    });
                } catch (logError) {
                    console.error('❌ Erro ao salvar log:', logError);
                }
            }
        })();

        return Response.json({ success: true });

    } catch (error) {
        console.error('❌ Erro no webhook:', error);
        return Response.json({ success: true }); // Sempre retornar 200 para o MP
    }
});