import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await req.json();
    const { payment_id, sale_id } = payload;

    // Se tiver payment_id, procura a venda
    let catalogSale = null;
    if (payment_id) {
      const payments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({
        payment_id: String(payment_id)
      });
      if (payments.length > 0) {
        const catalogSaleId = payments[0].catalog_sale_id;
        if (catalogSaleId) {
          const sales = await base44.asServiceRole.entities.CatalogSale.filter({ id: catalogSaleId });
          catalogSale = sales.length > 0 ? sales[0] : null;
        }
      }
    }

    // Se tiver sale_id direto
    if (!catalogSale && sale_id) {
      const sales = await base44.asServiceRole.entities.CatalogSale.filter({ id: sale_id });
      catalogSale = sales.length > 0 ? sales[0] : null;
    }

    if (!catalogSale) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Buscar usuário licenciado
    const licensee = await base44.asServiceRole.entities.AppUser.filter({ id: catalogSale.licensee_id });
    const licenseeUser = licensee.length > 0 ? licensee[0] : null;

    // Analisar problema
    const analysis = {
      sale_id: catalogSale.id,
      licensee_id: catalogSale.licensee_id,
      licensee_name: licenseeUser?.full_name,
      licensee_referral_code: licenseeUser?.referral_code,
      sale_referral_code: catalogSale.referral_code,
      sale_status: catalogSale.status,
      total_amount: catalogSale.total_amount,
      problem: catalogSale.referral_code ? '✅ referral_code presente' : '❌ referral_code VAZIO'
    };

    // Se vazio, corrigi-lo automaticamente
    if (!catalogSale.referral_code && licenseeUser?.referral_code) {
      await base44.asServiceRole.entities.CatalogSale.update(catalogSale.id, {
        referral_code: licenseeUser.referral_code
      });
      analysis.action = `✅ Corrigido! referral_code atualizado para: ${licenseeUser.referral_code}`;
      
      // Reprocessar comissão
      if (catalogSale.status === 'paid') {
        try {
          await base44.asServiceRole.functions.invoke('processCatalogCommission', {
            sale_id: catalogSale.id
          });
          analysis.commission_action = '✅ Comissão reprocessada com sucesso';
        } catch (err) {
          analysis.commission_action = `❌ Erro ao reprocessar: ${err.message}`;
        }
      }
    }

    return Response.json(analysis);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});