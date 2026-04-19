import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { payment_id, catalog_sale_ids } = await req.json();

        if (!payment_id || !catalog_sale_ids) {
            return Response.json({ error: 'payment_id e catalog_sale_ids obrigatórios' }, { status: 400 });
        }

        // Busca o AsaasPayment pelo payment_id do ASAAS
        const payments = await base44.asServiceRole.entities.AsaasPayment.filter(
            { payment_id: payment_id },
            null,
            1
        );

        if (!payments || payments.length === 0) {
            console.warn('⚠️ AsaasPayment não encontrado para vincular:', payment_id);
            return Response.json({ success: false, error: 'AsaasPayment not found' });
        }

        const asaasPayment = payments[0];

        // Atualiza catalog_sale_id e external_reference
        await base44.asServiceRole.entities.AsaasPayment.update(asaasPayment.id, {
            catalog_sale_id: catalog_sale_ids,
            external_reference: catalog_sale_ids
        });

        console.log('✅ AsaasPayment vinculado:', payment_id, '→ CatalogSales:', catalog_sale_ids);

        return Response.json({ success: true, linked: catalog_sale_ids });

    } catch (error) {
        console.error('❌ Erro em linkPaymentToCatalogSale:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});