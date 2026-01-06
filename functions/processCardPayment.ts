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
                        payment_method: {
                            id: payment_method_id,
                            type: payment_method_id?.includes('debit') ? 'debit_card' : 'credit_card',
                            token: token,
                            installments: Number(installments)
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
        console.log('📥 Resposta completa MP:', JSON.stringify(order, null, 2));

        // 🔍 EXTRAIR STATUS REAL
        const paymentTransaction = order.transactions?.payments?.[0] || order.data?.transactions?.payments?.[0];
        const paymentStatus = paymentTransaction?.status;
        const statusDetail = paymentTransaction?.status_detail || order.data?.status_detail || order.status_detail;
        const orderStatus = order.data?.status || order.status;
        const paymentId = paymentTransaction?.id || order.id || order.data?.id;

        console.log('🔍 STATUS ANALYSIS:', {
            http_status: response.status,
            order_status: orderStatus,
            payment_status: paymentStatus,
            status_detail: statusDetail,
            has_errors: !!order.errors
        });

        // ❌ DETECTAR FALHA REAL
        const isFailed = 
            !response.ok || 
            orderStatus === 'failed' || 
            paymentStatus === 'failed' || 
            paymentStatus === 'rejected' ||
            statusDetail?.includes('invalid') ||
            order.errors;

        if (isFailed) {
            console.error('❌ PAGAMENTO REJEITADO:', {
                status: paymentStatus,
                detail: statusDetail,
                errors: order.errors
            });

            // Salvar falha no banco
            await base44.entities.MercadoPagoPayment.create({
                auction_id,
                user_id: user.id,
                payment_id: String(paymentId),
                amount: transaction_amount,
                external_reference: externalReference,
                status: 'failed',
                payment_method: payment_method_id
            });

            return Response.json({ 
                success: false,
                error: statusDetail || order.errors?.[0]?.message || 'Pagamento rejeitado pelo Mercado Pago',
                details: {
                    status: paymentStatus,
                    status_detail: statusDetail,
                    errors: order.errors
                }
            }, { status: 422 });
        }

        // ✅ PAGAMENTO APROVADO/PROCESSADO/EM ANÁLISE
        const isApproved = 
            paymentStatus === 'processed' || 
            paymentStatus === 'approved' ||
            paymentStatus === 'in_review' ||
            orderStatus === 'processed' ||
            orderStatus === 'in_review';

        // Salvar no banco
        await base44.entities.MercadoPagoPayment.create({
            auction_id,
            user_id: user.id,
            payment_id: String(paymentId),
            amount: transaction_amount,
            external_reference: externalReference,
            status: isApproved ? 'approved' : paymentStatus,
            payment_method: payment_method_id
        });

        // Se aprovado, atualizar leilão
        if (isApproved) {
            await base44.entities.Auction.update(auction_id, {
                order_status: 'paid'
            });
        }

        return Response.json({
            success: isApproved,
            order_id: order.data?.id || order.id,
            payment_id: paymentId,
            status: orderStatus,
            payment_status: paymentStatus,
            status_detail: statusDetail
        });

    } catch (error) {
        console.error('Erro:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});