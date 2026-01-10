import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { product_id, buyer_data, licensee_code } = await req.json();

    if (!product_id || !buyer_data || !licensee_code) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1️⃣ Busca o produto
    const products = await base44.asServiceRole.entities.Product.filter({ id: product_id });
    if (!products || products.length === 0) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }
    const product = products[0];

    // 2️⃣ Busca o licenciado
    const licensees = await base44.asServiceRole.entities.AppUser.filter({ referral_code: licensee_code });
    if (!licensees || licensees.length === 0) {
      return Response.json({ error: 'Licensee not found' }, { status: 404 });
    }
    const licensee = licensees[0];

    // 3️⃣ Busca ou cria comprador
    let buyer = user;
    if (buyer_data.email !== user.email) {
      const buyers = await base44.asServiceRole.entities.AppUser.filter({ email: buyer_data.email });
      if (buyers && buyers.length > 0) {
        buyer = buyers[0];
      }
    }

    // 4️⃣ Cria registro de venda
    const saleAmount = product.price_catalog || 0;
    const commissionRate = licensee.catalog_commission_rate || 0.13;
    const commissionAmount = saleAmount * commissionRate;

    const catalogSale = await base44.asServiceRole.entities.CatalogSale.create({
      product_id: product.id,
      product_title: product.description,
      product_image: product.image_urls?.[0] || '',
      sale_price: saleAmount,
      buyer_id: buyer.id,
      buyer_name: buyer_data.full_name || buyer.full_name,
      buyer_email: buyer_data.email || buyer.email,
      buyer_phone: buyer_data.phone || buyer.phone,
      licensee_id: licensee.id,
      licensee_name: licensee.full_name,
      licensee_plan: licensee.license_plan,
      referred_by_code: licensee_code,
      status: 'pending_payment',
      commission_licensee_amount: commissionAmount,
      commission_licensee_rate: commissionRate
    });

    // 5️⃣ Cria registro de comissão do licenciado
    const commissionRecord = await base44.asServiceRole.entities.CommissionRecord.create({
      sale_id: catalogSale.id,
      sale_type: 'catalog',
      sale_amount: saleAmount,
      recipient_id: licensee.id,
      recipient_name: licensee.full_name,
      commission_type: 'licensee',
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      status: 'pending'
    });

    // 6️⃣ Atualiza saldo do licenciado (provisório)
    await base44.asServiceRole.entities.AppUser.update(licensee.id, {
      commission_balance: (licensee.commission_balance || 0) + commissionAmount,
      total_catalog_sales: (licensee.total_catalog_sales || 0) + 1,
      total_catalog_commission: (licensee.total_catalog_commission || 0) + commissionAmount
    });

    // 7️⃣ Calcula bônus de carreira (se aplicável)
    const careerHierarchy = ['fundador', 'conselheiro', 'ceo', 'diretor', 'executivo', 'licenciado_catalogo', 'licenciado_aplicativo', 'usuario'];
    const userLevels = Array.isArray(licensee.career_levels) ? licensee.career_levels : [licensee.career_levels || 'usuario'];
    
    let referrer = null;
    if (licensee.referred_by_id) {
      const referrers = await base44.asServiceRole.entities.AppUser.filter({ id: licensee.referred_by_id });
      if (referrers && referrers.length > 0) {
        referrer = referrers[0];
      }
    }

    // Calcula bônus de carreira
    if (referrer && userLevels.includes('licenciado_catalogo')) {
      const referrerLevels = Array.isArray(referrer.career_levels) ? referrer.career_levels : [referrer.career_levels || 'usuario'];
      
      // Bônus 1% para executivo
      if (referrerLevels.includes('executivo')) {
        const bonus = saleAmount * 0.01;
        await base44.asServiceRole.entities.CommissionRecord.create({
          sale_id: catalogSale.id,
          sale_type: 'catalog',
          sale_amount: saleAmount,
          recipient_id: referrer.id,
          recipient_name: referrer.full_name,
          commission_type: 'career_executive',
          commission_rate: 0.01,
          commission_amount: bonus,
          status: 'pending'
        });
        await base44.asServiceRole.entities.AppUser.update(referrer.id, {
          commission_balance: (referrer.commission_balance || 0) + bonus,
          total_commissions_generated: (referrer.total_commissions_generated || 0) + bonus
        });
      }

      // Bônus 1% para diretor
      if (referrerLevels.includes('diretor')) {
        const bonus = saleAmount * 0.01;
        await base44.asServiceRole.entities.CommissionRecord.create({
          sale_id: catalogSale.id,
          sale_type: 'catalog',
          sale_amount: saleAmount,
          recipient_id: referrer.id,
          recipient_name: referrer.full_name,
          commission_type: 'career_director',
          commission_rate: 0.01,
          commission_amount: bonus,
          status: 'pending'
        });
        await base44.asServiceRole.entities.AppUser.update(referrer.id, {
          commission_balance: (referrer.commission_balance || 0) + bonus,
          total_commissions_generated: (referrer.total_commissions_generated || 0) + bonus
        });
      }
    }

    return Response.json({
      success: true,
      sale_id: catalogSale.id,
      total: saleAmount,
      commission: commissionAmount,
      message: 'Venda processada com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao processar venda do catálogo:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});