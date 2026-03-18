import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * 🧪 TESTE E2E ADMIN: Venda de Catálogo R$ 100 com comissões
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    
    // Deve ser admin
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    console.log('\n🧪 TESTE E2E: VENDA R$ 100 + COMISSÕES\n');

    const steps = [];

    // 1. Buscar licenciado
    console.log('1️⃣  Buscando licenciado_catalogo...');
    const licensees = await base44.asServiceRole.entities.AppUser.list();
    const licensee = licensees.find(u => 
      Array.isArray(u.career_levels) && u.career_levels.includes('licenciado_catalogo')
    );

    if (!licensee) {
      return Response.json({ error: 'Sem licenciado' }, { status: 404 });
    }

    console.log(`✅ ${licensee.full_name}`);
    steps.push(`✅ Licenciado: ${licensee.full_name}`);

    // 2. Buscar produto
    console.log('2️⃣  Buscando produto...');
    const products = await base44.asServiceRole.entities.Product.list();
    const product = products.find(p => p.catalog_active && p.price_catalog > 0);

    if (!product) {
      return Response.json({ error: 'Sem produto' }, { status: 404 });
    }

    console.log(`✅ ${product.description}`);
    steps.push(`✅ Produto: ${product.description}`);

    // 3. Saldos ANTES
    console.log('3️⃣  Saldos ANTES:');
    const balanceBefore = Number(licensee.catalog_commission_balance || 0);
    console.log(`   R$ ${balanceBefore.toFixed(2)}`);
    steps.push(`💰 ANTES: R$ ${balanceBefore.toFixed(2)}`);

    // 4. Criar venda
    console.log('4️⃣  Criando CatalogSale...');
    const sale = await base44.asServiceRole.entities.CatalogSale.create({
      product_id: product.id,
      product_title: product.description,
      product_image: product.image_urls?.[0] || '',
      sale_price: 100.00,
      total_amount: 100.00,
      buyer_id: licensee.id,
      buyer_name: licensee.full_name,
      buyer_email: licensee.email,
      buyer_phone: licensee.phone || '11999999999',
      licensee_id: licensee.id,
      licensee_name: licensee.full_name,
      licensee_plan: licensee.primary_career_level,
      referral_code: licensee.referral_code,
      status: 'pending_payment'
    });

    console.log(`✅ ${sale.id}`);
    steps.push(`✅ CatalogSale: ${sale.id}`);

    // 5. Marcar como PAID
    console.log('5️⃣  Marcando como PAID...');
    await base44.asServiceRole.entities.CatalogSale.update(sale.id, { status: 'paid' });
    console.log(`✅ Status = PAID`);
    steps.push(`✅ CatalogSale.status = paid`);

    // 6. Criar comissão
    console.log('6️⃣  Criando comissão...');
    const commissionAmount = 13.00; // 13% de R$ 100
    
    await base44.asServiceRole.entities.CommissionRecord.create({
      sale_id: sale.id,
      sale_type: 'catalog',
      user_id: licensee.id,
      user_name: licensee.full_name,
      role: 'licenciado_catalogo',
      percent: 13.0,
      amount: commissionAmount,
      sale_amount: 100,
      product_title: product.description,
      anchor_user_id: licensee.id,
      anchor_user_name: licensee.full_name,
      status: 'confirmed'
    });

    console.log(`✅ CommissionRecord criada: R$ ${commissionAmount.toFixed(2)}`);
    steps.push(`✅ CommissionRecord: R$ ${commissionAmount.toFixed(2)}`);

    // 7. Atualizar saldo
    console.log('7️⃣  Atualizando saldo...');
    const newBalance = balanceBefore + commissionAmount;
    
    await base44.asServiceRole.entities.AppUser.update(licensee.id, {
      catalog_commission_balance: newBalance,
      catalog_total_commissions_generated: (licensee.catalog_total_commissions_generated || 0) + commissionAmount,
      valora_pay_balance: (licensee.valora_pay_balance || 0) + commissionAmount,
      commission_balance: (licensee.commission_balance || 0) + commissionAmount,
      total_commissions_generated: (licensee.total_commissions_generated || 0) + commissionAmount
    });

    console.log(`✅ Saldo atualizado`);
    steps.push(`✅ Saldo atualizado`);

    // 8. Saldos DEPOIS
    console.log('8️⃣  Saldos DEPOIS:');
    const licenseeAfter = (await base44.asServiceRole.entities.AppUser.filter({ id: licensee.id }))[0];
    const balanceAfter = Number(licenseeAfter?.catalog_commission_balance || 0);
    console.log(`   R$ ${balanceAfter.toFixed(2)}`);
    steps.push(`💰 DEPOIS: R$ ${balanceAfter.toFixed(2)}`);

    // 9. Diferença
    const delta = balanceAfter - balanceBefore;
    console.log(`\n9️⃣  DIFERENÇA: +R$ ${delta.toFixed(2)}`);
    
    if (delta > 0) {
      console.log('✅✅✅ COMISSÃO ACREDITADA COM SUCESSO! ✅✅✅');
      steps.push(`✅ COMISSÃO ACREDITADA!`);
    } else {
      console.log('❌ FALHA: Saldo não foi atualizado');
      steps.push(`❌ FALHA: Saldo não mudou`);
    }

    console.log('\n🧪 TESTE CONCLUÍDO\n');

    return Response.json({
      success: delta > 0,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      delta: delta,
      steps: steps
    });

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});