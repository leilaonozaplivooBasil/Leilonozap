import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { 
            auction_id, 
            transaction_amount, 
            token,
            payment_method_id, 
            installments,
            payer,
            issuer_id,
            card_number,
            security_code,
            expiration_date
        } = await req.json();

        if (!auction_id || !transaction_amount || !payment_method_id) {
            return Response.json({ error: 'Dados obrigatórios faltando' }, { status: 400 });
        }

        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!accessToken) {
            return Response.json({ error: 'Credenciais não configuradas' }, { status: 500 });
        }

        const externalReference = `${auction_id}_${Date.now()}`;
        const idempotencyKey = `${auction_id}_${user.id}_${Date.now()}`;

        // Criar order com pagamento (API Orders) - usando dados do Brick
        const orderData = {
            type: "online",
            processing_mode: "automatic",
            total_amount: String(transaction_amount),
            external_reference: externalReference,
            payer: {
                email: payer.email,
                identification: payer.identification
            },
            transactions: {
                payments: [
                    {
                        amount: String(transaction_amount),
                        payment_method: token ? {
                            // Se tiver token (fluxo antigo)
                            id: payment_method_id,
                            type: payment_method_id?.includes('debit') ? 'debit_card' : 'credit_card',
                            token: token,
                            installments: Number(installments)
                        } : {
                            // Se não tiver token (Brick envia dados diretos)
                            id: payment_method_id,
                            type: payment_method_id?.includes('debit') ? 'debit_card' : 'credit_card',
                            installments: Number(installments),
                            issuer_id: issuer_id,
                            card: {
                                card_number: card_number,
                                security_code: security_code,
                                expiration_date: expiration_date,
                                cardholder: {
                                    name: payer.cardholder?.name,
                                    identification: payer.identification
                                }
                            }
                        }
                    }
                ]
            }
        };

        console.log('Criando order:', orderData);

        const response = await fetch('https://api.mercadopago.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify(orderData)
        });

        const order = await response.json();
        console.log('Resposta MP:', order);

        if (!response.ok) {
            console.error('Erro MP:', order);
            return Response.json({ 
                success: false,
                error: order.message || 'Falha ao processar pagamento' 
            }, { status: 422 });
        }

        // Extrair dados do pagamento
        const paymentTransaction = order.transactions?.payments?.[0];
        const paymentId = paymentTransaction?.id || order.id;
        const paymentStatus = paymentTransaction?.status || order.status;

        // Salvar no banco
        await base44.entities.MercadoPagoPayment.create({
            auction_id,
            user_id: user.id,
            payment_id: String(paymentId),
            amount: transaction_amount,
            external_reference: externalReference,
            status: paymentStatus === 'processed' ? 'approved' : paymentStatus,
            payment_method: payment_method_id
        });

        // Se aprovado/processado, atualizar leilão
        if (paymentStatus === 'processed' || order.status === 'processed') {
            await base44.entities.Auction.update(auction_id, {
                order_status: 'paid'
            });
        }

        return Response.json({
            success: true,
            order_id: order.id,
            payment_id: paymentId,
            status: order.status,
            status_detail: order.status_detail
        });

    } catch (error) {
        console.error('Erro:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});