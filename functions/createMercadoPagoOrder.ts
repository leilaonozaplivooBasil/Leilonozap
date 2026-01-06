import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { order_id, payment_method, installments = 1, payer_data, card_data } = await req.json();
        
        if (!order_id) {
            return Response.json({ error: 'order_id obrigatório' }, { status: 400 });
        }

        // Busca o pedido (Auction)
        const auctions = await base44.asServiceRole.entities.Auction.filter({ id: order_id });
        
        if (!auctions || auctions.length === 0) {
            return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
        }
        
        const auction = auctions[0];
        
        // Valida se o usuário é o vencedor
        if (auction.winner_id !== user.id) {
            return Response.json({ error: 'Você não é o vencedor deste leilão' }, { status: 403 });
        }

        // Verifica se já tem pagamento APROVADO
        const existingPayments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({ 
            order_id: order_id,
            status: 'APPROVED'
        });
        
        if (existingPayments && existingPayments.length > 0) {
            return Response.json({
                success: true,
                already_paid: true,
                payment: existingPayments[0]
            });
        }

        const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
        
        if (!MP_ACCESS_TOKEN) {
            return Response.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
        }

        const amount = auction.current_price || auction.starting_price;
        
        // Se não especificar método, retorna apenas os dados para o checkout
        if (!payment_method) {
            return Response.json({
                success: true,
                amount: amount,
                order_details: {
                    title: auction.title,
                    description: auction.description,
                    image: auction.image_urls?.[0] || null
                }
            });
        }

        // Cria pagamento via Checkout API (PIX ou Card)
        const paymentData = {
            transaction_amount: amount,
            description: auction.title,
            payment_method_id: payment_method === 'credit_card' ? 'master' : payment_method, // Padrão master, mas pode detectar bandeira
            payer: {
                email: user.email,
                first_name: user.full_name?.split(' ')[0] || 'Comprador',
                last_name: user.full_name?.split(' ').slice(1).join(' ') || 'NoZap',
                identification: payer_data?.cpf ? {
                    type: 'CPF',
                    number: payer_data.cpf.replace(/\D/g, '')
                } : undefined,
                address: payer_data?.address ? {
                    zip_code: payer_data.address.zip_code?.replace(/\D/g, ''),
                    street_name: payer_data.address.street,
                    street_number: payer_data.address.number,
                    neighborhood: payer_data.address.neighborhood,
                    city: payer_data.address.city,
                    federal_unit: payer_data.address.state
                } : undefined
            },
            external_reference: order_id,
            notification_url: 'https://leilaonozap.app/api/webhooks/mercadopago'
        };

        // Para cartão, adiciona dados do cartão e installments
        if (payment_method === 'credit_card' && card_data) {
            paymentData.installments = installments;
            paymentData.token = await createCardToken(card_data, MP_ACCESS_TOKEN);
            
            if (!paymentData.token) {
                return Response.json({ error: 'Erro ao processar dados do cartão' }, { status: 400 });
            }
            
            // Detecta bandeira do cartão
            const firstDigit = card_data.number.charAt(0);
            if (firstDigit === '4') paymentData.payment_method_id = 'visa';
            else if (firstDigit === '5') paymentData.payment_method_id = 'master';
            else if (firstDigit === '3') paymentData.payment_method_id = 'amex';
            else if (firstDigit === '6') paymentData.payment_method_id = 'elo';
        }

        // Função auxiliar para criar token do cartão
        async function createCardToken(cardData, token) {
            try {
                const tokenResponse = await fetch('https://api.mercadopago.com/v1/card_tokens', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        card_number: cardData.number,
                        cardholder: {
                            name: cardData.holder_name,
                            identification: {
                                type: 'CPF',
                                number: payer_data.cpf.replace(/\D/g, '')
                            }
                        },
                        security_code: cardData.security_code,
                        expiration_month: parseInt(cardData.expiration_month),
                        expiration_year: parseInt(`20${cardData.expiration_year}`)
                    })
                });
                
                if (!tokenResponse.ok) return null;
                
                const tokenData = await tokenResponse.json();
                return tokenData.id;
            } catch (err) {
                console.error('Erro ao criar token:', err);
                return null;
            }
        }

        const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': order_id
            },
            body: JSON.stringify(paymentData)
        });

        if (!mpResponse.ok) {
            const errorData = await mpResponse.text();
            console.error('Erro Mercado Pago:', errorData);
            return Response.json({ error: 'Erro ao criar pagamento no Mercado Pago' }, { status: 500 });
        }

        const mpData = await mpResponse.json();

        // Salva pagamento no banco
        const payment = await base44.asServiceRole.entities.MercadoPagoPayment.create({
            order_id: order_id,
            provider: 'mercadopago',
            provider_payment_id: String(mpData.id),
            status: mpData.status?.toUpperCase() || 'PENDING',
            amount: amount,
            payment_method: payment_method,
            installments: installments,
            external_reference: order_id,
            payer_email: user.email,
            payer_name: user.full_name,
            qr_code: mpData.point_of_interaction?.transaction_data?.qr_code || null,
            qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64 || null,
            ticket_url: mpData.point_of_interaction?.transaction_data?.ticket_url || null,
            status_detail: mpData.status_detail || null,
            metadata: mpData
        });

        return Response.json({
            success: true,
            payment_id: payment.id,
            provider_payment_id: mpData.id,
            status: mpData.status?.toUpperCase(),
            amount: amount,
            qr_code: payment.qr_code,
            qr_code_base64: payment.qr_code_base64,
            ticket_url: payment.ticket_url,
            payment_method: payment_method
        });

    } catch (error) {
        console.error('Erro ao criar ordem:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});