import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { payment_id, sale_id, operation_id } = payload;

    // Encontrar a venda por payment_id, sale_id ou operation_id
    let catalogSale = null;

    if (operation_id) {
      const payments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({
        payment_id: String(operation_id)
      });
      if (payments.length > 0 && payments[0].catalog_sale_id) {
        const sales = await base44.asServiceRole.entities.CatalogSale.filter({ 
          id: payments[0].catalog_sale_id 
        });
        catalogSale = sales.length > 0 ? sales[0] : null;
      }
    }

    if (!catalogSale && payment_id) {
      const payments = await base44.asServiceRole.entities.MercadoPagoPayment.filter({
        payment_id: String(payment_id)
      });
      if (payments.length > 0 && payments[0].catalog_sale_id) {
        const sales = await base44.asServiceRole.entities.CatalogSale.filter({ 
          id: payments[0].catalog_sale_id 
        });
        catalogSale = sales.length > 0 ? sales[0] : null;
      }
    }

    if (!catalogSale && sale_id) {
      const sales = await base44.asServiceRole.entities.CatalogSale.filter({ id: sale_id });
      catalogSale = sales.length > 0 ? sales[0] : null;
    }

    if (!catalogSale) {
      return Response.json({ error: 'Venda não encontrada' }, { status: 404 });
    }

    // Buscar informações da venda
    const product = await base44.asServiceRole.entities.Product.filter({ 
      id: catalogSale.product_id 
    });
    const buyer = await base44.asServiceRole.entities.AppUser.filter({ 
      id: catalogSale.buyer_id 
    });

    // Buscar a âncora (licenciado que fez a venda via ?ref)
    let licenseUser = null;
    if (catalogSale.referral_code) {
      const users = await base44.asServiceRole.entities.AppUser.filter({ 
        referral_code: catalogSale.referral_code 
      });
      licenseUser = users.length > 0 ? users[0] : null;
    }

    // Construir cadeia hierárquica completa
    const chain = [];
    let current = licenseUser;
    const seen = new Set();
    while (current && !seen.has(current.id)) {
      chain.push({
        id: current.id,
        full_name: current.full_name,
        email: current.email,
        career_levels: current.career_levels || [],
        primary_career_level: current.primary_career_level
      });
      seen.add(current.id);
      if (current.referred_by_id) {
        const parent = await base44.asServiceRole.entities.AppUser.filter({ 
          id: current.referred_by_id 
        });
        current = parent.length > 0 ? parent[0] : null;
      } else {
        current = null;
      }
    }

    // Buscar registros de comissão desta venda
    const commissions = await base44.asServiceRole.entities.CommissionRecord.filter({ 
      sale_id: catalogSale.id 
    });

    // Buscar detalhes de cada pessoa que recebeu comissão
    const beneficiaries = [];
    for (const commission of commissions) {
      const user = await base44.asServiceRole.entities.AppUser.filter({ 
        id: commission.user_id 
      });
      if (user.length > 0) {
        beneficiaries.push({
          user: {
            id: user[0].id,
            full_name: user[0].full_name,
            email: user[0].email,
            primary_career_level: user[0].primary_career_level
          },
          role: commission.role,
          percent: commission.percent,
          amount: commission.amount,
          status: commission.status
        });
      }
    }

    const result = {
      sale: {
        id: catalogSale.id,
        status: catalogSale.status,
        total_amount: catalogSale.total_amount,
        referral_code: catalogSale.referral_code,
        created_date: catalogSale.created_date
      },
      product: {
        id: product.length > 0 ? product[0].id : null,
        description: product.length > 0 ? product[0].description : 'Produto não encontrado'
      },
      buyer: {
        id: buyer.length > 0 ? buyer[0].id : null,
        full_name: buyer.length > 0 ? buyer[0].full_name : 'Comprador não encontrado',
        email: buyer.length > 0 ? buyer[0].email : null
      },
      license_user: licenseUser ? {
        id: licenseUser.id,
        full_name: licenseUser.full_name,
        email: licenseUser.email,
        referral_code: licenseUser.referral_code
      } : null,
      hierarchical_chain: chain,
      beneficiaries: beneficiaries,
      total_distributed: beneficiaries.reduce((sum, b) => sum + b.amount, 0),
      commission_records_count: commissions.length
    };

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});