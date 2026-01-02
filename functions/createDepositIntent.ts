import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { deposit_package_id } = await req.json();

        if (!deposit_package_id) {
            return Response.json({ error: 'deposit_package_id é obrigatório' }, { status: 400 });
        }

        // Buscar pacote de depósito
        const packages = await base44.asServiceRole.entities.DepositPackage.filter({ 
            id: deposit_package_id,
            is_active: true 
        });

        if (packages.length === 0) {
            return Response.json({ error: 'Pacote não encontrado ou inativo' }, { status: 404 });
        }

        const depositPackage = packages[0];

        // Buscar configurações de pagamento ativas
        const settings = await base44.asServiceRole.entities.PaymentSettings.filter({ 
            is_active: true 
        });

        if (settings.length === 0) {
            return Response.json({ 
                error: 'Nenhum gateway de pagamento configurado. Configure em Configurar Pagamentos.' 
            }, { status: 400 });
        }

        const gatewayConfig = settings[0];

        // Gerar reference_id único
        const reference_id = `DEP_${user.id}_${Date.now()}`;

        // Criar registro de transação como pending
        const transaction = await base44.asServiceRole.entities.WalletTransaction.create({
            user_id: user.id,
            type: 'deposit',
            direction: 'credit',
            amount: depositPackage.amount,
            status: 'pending',
            reference_id: reference_id,
            description: `Depósito via ${depositPackage.label}`
        });

        // Se for gateway genérico HTTP, fazer a chamada
        if (gatewayConfig.gateway_type === 'generic_http' && gatewayConfig.base_url) {
            try {
                const url = `${gatewayConfig.base_url}${gatewayConfig.payment_endpoint || '/payments'}`;
                
                // Preparar headers
                let headers = {
                    'Content-Type': 'application/json'
                };

                if (gatewayConfig.headers_json) {
                    try {
                        const customHeaders = JSON.parse(
                            gatewayConfig.headers_json.replace(/\{\{API_KEY\}\}/g, gatewayConfig.api_key || '')
                        );
                        headers = { ...headers, ...customHeaders };
                    } catch (e) {
                        console.error('Erro ao parsear headers:', e);
                    }
                }

                // Preparar body
                const body = {
                    amount: depositPackage.amount,
                    description: depositPackage.label,
                    [gatewayConfig.reference_field || 'reference_id']: reference_id,
                    customer: {
                        name: user.full_name,
                        email: user.email,
                        phone: user.phone
                    }
                };

                // Fazer requisição ao gateway
                const response = await fetch(url, {
                    method: gatewayConfig.http_method || 'POST',
                    headers: headers,
                    body: JSON.stringify(body)
                });

                const gatewayResponse = await response.json();

                // Salvar gateway_payment_id e payload
                await base44.asServiceRole.entities.WalletTransaction.update(transaction.id, {
                    gateway_payment_id: gatewayResponse.id || gatewayResponse.payment_id || gatewayResponse.charge_id,
                    raw_gateway_payload: gatewayResponse
                });

                // Retornar dados do pagamento
                return Response.json({
                    success: true,
                    transaction_id: transaction.id,
                    reference_id: reference_id,
                    amount: depositPackage.amount,
                    payment_data: {
                        qr_code: gatewayResponse.qr_code || gatewayResponse.qrCode || null,
                        qr_code_text: gatewayResponse.qr_code_text || gatewayResponse.qrCodeText || gatewayResponse.payload || null,
                        checkout_url: gatewayResponse.checkout_url || gatewayResponse.checkoutUrl || gatewayResponse.url || null,
                        gateway_id: gatewayResponse.id || gatewayResponse.payment_id || null
                    }
                });

            } catch (gatewayError) {
                console.error('Erro ao chamar gateway:', gatewayError);
                
                // Atualizar transação como failed
                await base44.asServiceRole.entities.WalletTransaction.update(transaction.id, {
                    status: 'failed',
                    raw_gateway_payload: { error: gatewayError.message }
                });

                return Response.json({ 
                    error: 'Erro ao processar pagamento no gateway',
                    details: gatewayError.message 
                }, { status: 500 });
            }
        }

        // Se for gateway manual (PIX), retornar dados do PIX
        if (gatewayConfig.gateway_name === 'manual' && gatewayConfig.pix_key) {
            return Response.json({
                success: true,
                transaction_id: transaction.id,
                reference_id: reference_id,
                amount: depositPackage.amount,
                payment_data: {
                    pix_key: gatewayConfig.pix_key,
                    pix_key_type: gatewayConfig.pix_key_type,
                    message: `Use esta chave PIX para realizar o pagamento de R$ ${depositPackage.amount.toFixed(2)}`
                }
            });
        }

        return Response.json({ 
            error: 'Gateway não configurado corretamente' 
        }, { status: 400 });

    } catch (error) {
        console.error('Erro geral:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});