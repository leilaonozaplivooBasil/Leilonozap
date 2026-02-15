import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { billing_id } = await req.json();

        if (!billing_id) {
            return Response.json({ error: 'billing_id obrigatório' }, { status: 400 });
        }

        const apiKey = Deno.env.get('ASAAS_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'ASAAS não configurado' }, { status: 500 });
        }

        // Buscar cobrança no ASAAS
        const paymentResponse = await fetch(
            `https://api.asaas.com/v3/payments/${billing_id}`,
            {
                headers: {
                    'access_token': apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        const paymentData = await paymentResponse.json();
        
        console.log('📥 Status ASAAS:', paymentData.status);

        const isPaid = paymentData.status === 'RECEIVED' || paymentData.status === 'CONFIRMED';

        // Atualizar registro local
        const payments = await base44.asServiceRole.entities.AsaasPayment.filter({ payment_id: billing_id });
        
        if (payments && payments.length > 0) {
            const localPayment = payments[0];
            
            // Se foi pago e ainda não processou, processar
            if (isPaid && localPayment.status !== 'confirmed') {
                console.log('✅ Pagamento confirmado! Processando...');
                
                // Atualiza pagamento
                await base44.asServiceRole.entities.AsaasPayment.update(localPayment.id, {
                    status: 'confirmed',
                    payment_date: new Date().toISOString()
                });

                // Cria PartnerPlanPurchase
                if (localPayment.partner_licensee_id && localPayment.partner_plan_code) {
                    
                    // Busca dados do usuário
                    const users = await base44.asServiceRole.entities.AppUser.filter({ id: localPayment.partner_licensee_id });
                    const user = users && users.length > 0 ? users[0] : null;

                    if (user) {
                        // Cria cronograma de 12 parcelas mensais
                        const schedule = [];
                        const startDate = new Date();
                        for (let i = 1; i <= 12; i++) {
                            const paymentDate = new Date(startDate);
                            paymentDate.setDate(paymentDate.getDate() + (i * 30));
                            schedule.push({
                                period: i,
                                date: paymentDate.toISOString(),
                                status: 'scheduled'
                            });
                        }

                        await base44.asServiceRole.entities.PartnerPlanPurchase.create({
                            user_id: user.id,
                            user_name: user.full_name,
                            user_email: user.email,
                            plan_name: localPayment.partner_plan_code,
                            plan_amount: localPayment.value,
                            activated_at: new Date().toISOString(),
                            status: 'active',
                            is_investment: true,
                            investment_rate: 3,
                            purchase_periods: schedule,
                            activation_source: 'pix_payment',
                            payment_id: billing_id
                        });

                        console.log('✅ PartnerPlanPurchase criado');

                        // Log
                        await base44.asServiceRole.entities.SystemLog.create({
                            step: 'PARTNER_PLAN_PIX_CONFIRMED',
                            status: 'success',
                            message: `Plano ${localPayment.partner_plan_code} confirmado via PIX`,
                            component_name: 'checkPartnerPlanPayment',
                            payload: {
                                user_id: user.id,
                                plan: localPayment.partner_plan_code,
                                amount: localPayment.value,
                                payment_id: billing_id
                            }
                        });
                    }
                }
            }
        }

        return Response.json({
            success: true,
            is_paid: isPaid,
            asaas_status: paymentData.status,
            payment_date: paymentData.paymentDate
        });

    } catch (error) {
        console.error('❌ Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});