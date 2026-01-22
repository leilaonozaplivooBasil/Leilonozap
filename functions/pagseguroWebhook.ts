import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.text();
    
    console.log('📥 Webhook PagSeguro recebido');
    console.log('Body:', body.substring(0, 500));

    let event;
    try {
      event = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ Erro ao parsear webhook:', parseError);
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Log detalhado
    console.log('🔍 Evento PagSeguro:', event.type);
    console.log('Order ID:', event.resource?.order?.id);
    console.log('Charge Status:', event.resource?.charge?.status);

    // Processa webhooks de pagamento
    if (event.type === 'charge.completed' || event.type === 'charge.paid') {
      const charge = event.resource?.charge;
      const order = event.resource?.order;
      
      if (!charge || !order) {
        console.warn('⚠️ Charge ou Order não encontrado no webhook');
        return Response.json({ status: 'processed' });
      }

      const referenceId = order.reference_id;
      console.log(`✅ Processando pagamento aprovado para referência: ${referenceId}`);

      // Atualiza CatalogSale se houver
      if (referenceId) {
        try {
          const sales = await base44.asServiceRole.entities.CatalogSale.filter({
            id: referenceId
          });

          if (sales && sales.length > 0) {
            const sale = sales[0];
            console.log(`📝 Atualizando CatalogSale ${sale.id}...`);

            await base44.asServiceRole.entities.CatalogSale.update(sale.id, {
              status: 'paid',
              payment_gateway: 'pagseguro',
              transaction_id: charge.id,
              order_id: order.id
            });

            console.log(`✅ CatalogSale ${sale.id} atualizada para 'paid'`);

            // Trigger para processar comissão
            try {
              await base44.asServiceRole.functions.invoke('processCatalogSale', {
                sale_id: sale.id,
                payment_gateway: 'pagseguro'
              });
            } catch (commissionErr) {
              console.warn('⚠️ Erro ao processar comissão:', commissionErr.message);
            }
          }
        } catch (updateErr) {
          console.error('❌ Erro ao atualizar CatalogSale:', updateErr.message);
        }
      }

      // Log de sucesso
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'PAGSEGURO_WEBHOOK_PROCESSED',
        status: 'success',
        message: `Pagamento PagSeguro processado: ${charge.id}`,
        component_name: 'pagseguroWebhook',
        payload: {
          order_id: order.id,
          charge_id: charge.id,
          status: charge.status,
          reference_id: referenceId
        }
      }).catch(() => {});
    }

    return Response.json({ status: 'processed' });

  } catch (error) {
    console.error('❌ Erro no webhook PagSeguro:', error);

    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'PAGSEGURO_WEBHOOK_ERROR',
        status: 'error',
        message: `Erro ao processar webhook: ${error.message}`,
        component_name: 'pagseguroWebhook',
        error_details: { stack: error.stack }
      });
    } catch {}

    return Response.json({ error: error.message }, { status: 500 });
  }
});