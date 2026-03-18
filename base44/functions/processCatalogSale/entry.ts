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

    // 4️⃣ Cria registro de venda (SEM criar comissões aqui)
    // ⚠️ IMPORTANTE: As comissões são processadas APENAS pelo processCatalogCommission
    // quando o pagamento for confirmado (status = 'paid')
    const saleAmount = product.price_catalog || 0;

    const catalogSale = await base44.asServiceRole.entities.CatalogSale.create({
      product_id: product.id,
      product_title: product.description,
      product_image: product.image_urls?.[0] || '',
      sale_price: saleAmount,
      total_amount: saleAmount, // Campo usado pelo processCatalogCommission
      buyer_id: buyer.id,
      buyer_name: buyer_data.full_name || buyer.full_name,
      buyer_email: buyer_data.email || buyer.email,
      buyer_phone: buyer_data.phone || buyer.phone,
      licensee_id: licensee.id,
      licensee_name: licensee.full_name,
      licensee_plan: licensee.license_plan,
      referred_by_code: licensee_code,
      status: 'pending_payment'
      // ❌ REMOVIDO: commission_licensee_amount e commission_licensee_rate
      // As comissões são calculadas pelo COMANDO MESTRE (26% distribuídos)
    });

    // ✅ NÃO cria CommissionRecord aqui
    // ✅ NÃO atualiza saldo aqui
    // Tudo isso é feito pelo processCatalogCommission quando status = 'paid'

    console.log(`✅ CatalogSale ${catalogSale.id} criada. Aguardando pagamento para processar comissões.`);

    return Response.json({
      success: true,
      sale_id: catalogSale.id,
      total: saleAmount,
      message: 'Venda criada! Comissões serão processadas após confirmação do pagamento.'
    });

  } catch (error) {
    console.error('Erro ao processar venda do catálogo:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});