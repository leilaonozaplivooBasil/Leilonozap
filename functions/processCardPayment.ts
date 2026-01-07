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

        // Limpar token de caracteres invisíveis/inválidos
        const cleanToken = accessToken.trim().replace(/[^\x20-\x7E]/g, '');

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

        console.log('📤 Criando order:', JSON.stringify(orderData, null, 2));
        console.log('🔑 Token (primeiros 30 chars):', cleanToken.substring(0, 30));

        const response = await fetch('https://api.mercadopago.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cleanToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify(orderData)
        });

        console.log('📊 HTTP Status:', response.status);
        console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('📄 Response completo:', responseText);

        // Se não há resposta ou resposta vazia, erro crítico
        if (!responseText || responseText.trim() === '') {
            console.error('❌ ERRO CRÍTICO: Mercado Pago retornou resposta vazia');
            console.error('🔑 Token usado (primeiros 20 chars):', cleanToken.substring(0, 20));
            
            return Response.json({ 
                success: false,
                state: 'failed',
                error: 'Token de acesso inválido ou expirado',
                message: 'Erro de autenticação com Mercado Pago. Verifique suas credenciais.',
                status: response.status,
                hint: 'O token MP_ACCESS_TOKEN pode estar inválido ou expirado'
            }, { status: 500 });
        }

        let order;
        try {
            order = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ Erro ao fazer parse da resposta:', parseError.message);
            return Response.json({ 
                success: false, 
                error: 'Resposta inválida do Mercado Pago',
                status: response.status,
                response: responseText.substring(0, 500)
            }, { status: 500 });
        }

        console.log('📥 Resposta completa MP:', JSON.stringify(order, null, 2));

        // 🔍 EXTRAIR STATUS REAL - fallback seguro para múltiplos formatos de resposta
        const payments = 
            order.transactions?.payments || 
            order.data?.transactions?.payments || 
            [];
        
        const paymentTransaction = payments[0];
        const paymentStatus = paymentTransaction?.status;
        const statusDetail = paymentTransaction?.status_detail || order.data?.status_detail || order.status_detail;
        const orderStatus = order.data?.status || order.status;
        const orderId = order.data?.id || order.id;
        const paymentId = paymentTransaction?.id || orderId;

        console.log('🔍 STATUS ANALYSIS:', {
            http_status: response.status,
            order_status: orderStatus,
            payment_status: paymentStatus,
            status_detail: statusDetail,
            has_errors: !!order.errors
        });

        // ❌ DETECTAR FALHA TÉCNICA
        if (!response.ok || order.errors) {
            console.error('❌ ERRO TÉCNICO MP:', {
                httpStatus: response.status,
                errors: order.errors,
                message: order.message,
                cause: order.cause
            });

            // Extrair mensagem de erro mais detalhada
            let errorMessage = 'Erro ao processar pagamento';
            let errorDetails = {};

            if (order.errors && Array.isArray(order.errors)) {
                errorMessage = order.errors[0]?.message || errorMessage;
                errorDetails = order.errors[0] || {};
            } else if (order.message) {
                errorMessage = order.message;
            }

            console.error('📋 Erro detalhado:', { errorMessage, errorDetails });

            try {
                await base44.asServiceRole.entities.MercadoPagoPayment.create({
                    auction_id,
                    user_id: user.id,
                    payment_id: String(paymentId || 'unknown'),
                    amount: transaction_amount,
                    external_reference: externalReference,
                    status: 'failed',
                    payment_method: payment_method_id
                });
            } catch (dbError) {
                console.error('Erro ao salvar no banco:', dbError.message);
            }

            // Log no SystemLog para análise
            try {
                await base44.asServiceRole.entities.SystemLog.create({
                    step: 'MERCADOPAGO_ORDER_ERROR',
                    status: 'error',
                    message: `Erro ao criar order no MP: ${errorMessage}`,
                    component_name: 'processCardPayment',
                    entity_id: auction_id,
                    error_details: {
                        httpStatus: response.status,
                        errorMessage,
                        errorDetails,
                        orderData: {
                            amount: transaction_amount,
                            payment_method_id,
                            installments
                        }
                    }
                });
            } catch (logError) {
                console.error('Erro ao salvar SystemLog:', logError.message);
            }

            return Response.json({ 
                success: false,
                state: 'failed',
                error: errorMessage,
                message: errorMessage,
                details: errorDetails
            }, { status: 422 });
        }

        // 🎯 DETERMINAR ESTADO DO PAGAMENTO
        let state = 'pending';
        let message = '';
        let dbStatus = paymentStatus;

        if (paymentStatus === 'rejected' || orderStatus === 'failed') {
            state = 'failed';
            message = 'Pagamento recusado. Verifique os dados do cartão e tente novamente.';
            dbStatus = 'rejected';
        } else if (paymentStatus === 'approved' || paymentStatus === 'processed') {
            state = 'approved';
            message = 'Pagamento aprovado com sucesso!';
            dbStatus = 'approved';
        } else if (['in_review', 'pending', 'action_required', 'processing'].includes(paymentStatus)) {
            state = 'pending';
            message = 'Pagamento em análise. Você receberá confirmação em instantes.';
            dbStatus = 'pending';
        } else {
            // Estado desconhecido, tratar como pending
            state = 'pending';
            message = 'Pagamento em processamento.';
            dbStatus = paymentStatus || 'pending';
        }

        console.log(`🎯 ESTADO FINAL: ${state} (${paymentStatus})`);

        // Salvar no banco
        try {
            await base44.asServiceRole.entities.MercadoPagoPayment.create({
                auction_id,
                user_id: user.id,
                payment_id: String(paymentId),
                amount: transaction_amount,
                external_reference: externalReference,
                status: dbStatus,
                payment_method: payment_method_id
            });

            // NÃO atualizar leilão aqui - deixar para o webhook
            // Evita race condition entre polling e webhook
        } catch (dbError) {
            console.error('Erro ao salvar no banco:', dbError.message);
        }

        return Response.json({
            success: true,
            state,
            message,
            order_id: orderId,
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