import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Buscar configurações ativas
        const settings = await base44.asServiceRole.entities.PaymentSettings.filter({ 
            is_active: true 
        });

        if (settings.length === 0) {
            console.error('Nenhuma configuração de pagamento ativa');
            return Response.json({ error: 'No active gateway configuration' }, { status: 400 });
        }

        const gatewayConfig = settings[0];

        // Validar webhook secret (se configurado)
        if (gatewayConfig.webhook_secret) {
            const signature = req.headers.get('X-Signature') || 
                            req.headers.get('X-Hub-Signature') || 
                            req.headers.get('Authorization');
            
            // Aqui você pode adicionar validação específica do gateway
            // Por simplicidade, apenas verificamos se existe
            if (!signature || !signature.includes(gatewayConfig.webhook_secret)) {
                console.error('Webhook signature inválida');
                return Response.json({ error: 'Invalid signature' }, { status: 401 });
            }
        }

        // Parsear payload
        const payload = await req.json();
        console.log('📥 Webhook recebido:', JSON.stringify(payload));

        // Extrair status do payload usando o caminho configurado
        const statusFieldPath = gatewayConfig.status_field_path || 'status';
        const pathParts = statusFieldPath.split('.');
        
        let paymentStatus = payload;
        for (const part of pathParts) {
            paymentStatus = paymentStatus?.[part];
        }

        console.log('📊 Status extraído:', paymentStatus);

        // Verificar se o pagamento foi aprovado
        const approvedValue = gatewayConfig.approved_status_value || 'paid';
        const isApproved = paymentStatus === approvedValue;

        if (!isApproved) {
            console.log('❌ Pagamento não aprovado. Status:', paymentStatus);
            return Response.json({ 
                success: true, 
                message: 'Webhook received but payment not approved' 
            }, { status: 200 });
        }

        // Extrair reference_id ou gateway_payment_id
        const referenceField = gatewayConfig.reference_field || 'reference_id';
        const reference_id = payload[referenceField] || 
                           payload.metadata?.[referenceField] ||
                           payload.external_reference;

        const gateway_payment_id = payload.id || payload.payment_id || payload.charge_id;

        console.log('🔍 Buscando transação:', { reference_id, gateway_payment_id });

        // Buscar transação pendente
        let transactions = [];
        
        if (reference_id) {
            transactions = await base44.asServiceRole.entities.WalletTransaction.filter({ 
                reference_id: reference_id 
            });
        }
        
        if (transactions.length === 0 && gateway_payment_id) {
            transactions = await base44.asServiceRole.entities.WalletTransaction.filter({ 
                gateway_payment_id: gateway_payment_id 
            });
        }

        if (transactions.length === 0) {
            console.error('❌ Transação não encontrada');
            return Response.json({ 
                error: 'Transaction not found' 
            }, { status: 404 });
        }

        const transaction = transactions[0];

        // IDEMPOTÊNCIA: Se já foi confirmada, não creditar novamente
        if (transaction.status === 'confirmed') {
            console.log('✅ Transação já confirmada anteriormente');
            return Response.json({ 
                success: true, 
                message: 'Transaction already confirmed' 
            }, { status: 200 });
        }

        console.log('💰 Creditando saldo...');

        // Atualizar status da transação
        await base44.asServiceRole.entities.WalletTransaction.update(transaction.id, {
            status: 'confirmed',
            raw_gateway_payload: payload
        });

        // Buscar ou criar carteira do usuário
        let wallets = await base44.asServiceRole.entities.Wallet.filter({ 
            user_id: transaction.user_id 
        });

        let wallet;
        if (wallets.length === 0) {
            // Criar carteira
            wallet = await base44.asServiceRole.entities.Wallet.create({
                user_id: transaction.user_id,
                balance: transaction.amount
            });
            console.log('✅ Carteira criada com saldo inicial:', transaction.amount);
        } else {
            // Atualizar saldo
            wallet = wallets[0];
            const newBalance = (wallet.balance || 0) + transaction.amount;
            await base44.asServiceRole.entities.Wallet.update(wallet.id, {
                balance: newBalance
            });
            console.log('✅ Saldo atualizado:', newBalance);
        }

        return Response.json({ 
            success: true, 
            message: 'Payment confirmed and balance updated',
            new_balance: wallet.balance || transaction.amount
        }, { status: 200 });

    } catch (error) {
        console.error('❌ Erro no webhook:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});