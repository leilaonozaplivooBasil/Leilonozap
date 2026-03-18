import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { auction_id, payment_data } = await req.json();

        if (!auction_id || !payment_data) {
            return Response.json({ error: 'Dados obrigatórios faltando' }, { status: 400 });
        }

        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!accessToken) {
            return Response.json({ error: 'Credenciais não configuradas' }, { status: 500 });
        }

        // Buscar dados do leilão
        const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });
        if (auctions.length === 0) {
            return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
        }

        const auction = auctions[0];
        const externalReference = `${auction_id}_${Date.now()}`;

        // Criar pagamento via Mercado Pago API
        const paymentPayload = {
            transaction_amount: auction.current_price,
            description: auction.title,
            payment_method_id: payment_data.payment_method_id,
            payer: {
                email: payment_data.payer.email,
                identification: payment_data.payer.identification
            },
            external_reference: externalReference
        };

        // Adicionar dados específicos do método de pagamento
        if (payment_data.payment_method_id === 'pix') {
            // PIX não precisa de dados extras
        } else {
            // Cartão de crédito
            paymentPayload.token = payment_data.token;
            paymentPayload.installments = payment_data.installments;
            paymentPayload.issuer_id = payment_data.issuer_id;
        }

        console.log('Criando pagamento:', paymentPayload);

        const response = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken.trim()}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': externalReference
            },
            body: JSON.stringify(paymentPayload)
        });

        const paymentResult = await response.json();
        console.log('Resposta MP:', paymentResult);

        if (!response.ok) {
            return Response.json({ 
                success: false,
                error: paymentResult.message || 'Erro ao processar pagamento',
                details: paymentResult
            }, { status: 422 });
        }

        // Salvar no banco de dados
        await base44.asServiceRole.entities.MercadoPagoPayment.create({
            auction_id,
            user_id: user.id,
            payment_id: String(paymentResult.id),
            amount: auction.current_price,
            external_reference: externalReference,
            status: paymentResult.status,
            payment_method: payment_data.payment_method_id
        });

        // Se for PIX, retornar QR Code
        if (payment_data.payment_method_id === 'pix') {
            return Response.json({
                success: true,
                payment_id: paymentResult.id,
                status: paymentResult.status,
                qr_code: paymentResult.point_of_interaction?.transaction_data?.qr_code,
                qr_code_base64: paymentResult.point_of_interaction?.transaction_data?.qr_code_base64
            });
        }

        // Cartão de crédito
        return Response.json({
            success: true,
            payment_id: paymentResult.id,
            status: paymentResult.status,
            status_detail: paymentResult.status_detail
        });

    } catch (error) {
        console.error('Erro:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});