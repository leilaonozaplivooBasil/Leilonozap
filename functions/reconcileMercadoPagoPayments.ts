import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Apenas admin pode rodar reconciliação
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin only' }, { status: 403 });
        }

        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!accessToken) {
            return Response.json({ error: 'MP_ACCESS_TOKEN not configured' }, { status: 500 });
        }

        console.log('🔄 Iniciando reconciliação Mercado Pago...');

        // Busca todos os pagamentos PENDING
        const pendingPayments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({
            status: 'pending'
        });

        console.log(`📊 ${pendingPayments.length} pagamentos pendentes encontrados`);

        let reconciled = 0;
        let approved = 0;
        let failed = 0;

        for (const dbPayment of pendingPayments) {
            try {
                // Evita reconciliar pagamentos muito novos (menos de 1min)
                const createdAt = new Date(dbPayment.created_date);
                const ageMinutes = (Date.now() - createdAt.getTime()) / 60000;
                
                if (ageMinutes < 1) {
                    console.log(`⏭️ Pagamento ${dbPayment.id} muito novo, pulando`);
                    continue;
                }

                // Se não tem payment_id, pula
                if (!dbPayment.payment_id) {
                    console.log(`⏭️ Pagamento ${dbPayment.id} sem payment_id, pulando`);
                    continue;
                }

                // Consulta status real no MP
                const mpResponse = await fetch(
                    `https://api.mercadopago.com/v1/payments/${dbPayment.payment_id}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken.trim()}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!mpResponse.ok) {
                    console.warn(`⚠️ Erro ao consultar MP para ${dbPayment.payment_id}: ${mpResponse.status}`);
                    failed++;
                    continue;
                }

                const payment = await mpResponse.json();
                const newStatus = payment.status;

                // Se status não mudou, pula
                if (dbPayment.status === newStatus) {
                    console.log(`✓ Pagamento ${dbPayment.id} status sem mudança`);
                    continue;
                }

                console.log(`🔄 Pagamento ${dbPayment.id}: ${dbPayment.status} → ${newStatus}`);

                // Atualiza MercadoPagoPayment
                await base44.asServiceRole.entities.MercadoPagoPayment.update(dbPayment.id, {
                    status: newStatus,
                    payment_method: payment.payment_type_id || payment.payment_method_id
                });

                // Se foi aprovado, processa venda e comissões
                if (newStatus === 'approved' && dbPayment.catalog_sale_id) {
                    console.log(`✅ Aprovado! Atualizando venda ${dbPayment.catalog_sale_id}`);

                    await base44.asServiceRole.entities.CatalogSale.update(
                        dbPayment.catalog_sale_id,
                        {
                            status: 'paid',
                            payment_id: String(dbPayment.payment_id)
                        }
                    );

                    // Processa comissões
                    await base44.asServiceRole.functions.invoke('processCatalogCommission', {
                        sale_id: dbPayment.catalog_sale_id
                    }).catch((err) => {
                        console.warn(`⚠️ Erro ao processar comissão: ${err.message}`);
                    });

                    approved++;
                }

                reconciled++;

            } catch (error) {
                console.error(`❌ Erro reconciliando ${dbPayment.id}:`, error.message);
                failed++;
            }
        }

        const summary = {
            total_checked: pendingPayments.length,
            reconciled,
            approved,
            failed,
            timestamp: new Date().toISOString()
        };

        console.log(`✅ Reconciliação concluída:`, summary);

        return Response.json(summary);

    } catch (error) {
        console.error('Erro crítico:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});