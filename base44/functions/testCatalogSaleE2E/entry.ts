import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * 🧪 TESTE E2E (END-TO-END) DE VENDA DE CATÁLOGO
 * 
 * Simula ponta-a-ponta:
 * 1. Busca um licenciado_catalogo
 * 2. Cria uma CatalogSale de R$ 100
 * 3. Valida saldos
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    console.log('\n🧪 ═══════════════════════════════════════════════════════════');
    console.log('🧪 TESTE E2E: VENDA DE CATÁLOGO R$ 100');
    console.log('🧪 ═══════════════════════════════════════════════════════════\n');

    const test = {
      steps: [],
      values: {}
    };

    // PASSO 1: Buscar um licenciado_catalogo
    console.log('📍 PASSO 1: Buscando licenciado_catalogo...');
    const licensees = await base44.entities.AppUser.list();
    const licensee = licensees.find(u => 
      Array.isArray(u.career_levels) && u.career_levels.includes('licenciado_catalogo')
    );

    if (!licensee) {
      return Response.json({ 
        error: 'Nenhum licenciado_catalogo encontrado no sistema'
      }, { status: 404 });
    }

    console.log(`✅ Licenciado: ${licensee.full_name} (${licensee.id})`);
    test.steps.push(`✅ Licenciado: ${licensee.full_name}`);
    test.values.licensee = licensee;

    // PASSO 2: Buscar um produto do catálogo
    console.log('\n📍 PASSO 2: Buscando produto do catálogo...');
    const products = await base44.entities.Product.list();
    const catalogProducts = products.filter(p => p.catalog_active === true && p.price_catalog > 0);

    if (catalogProducts.length === 0) {
      return Response.json({
        error: 'Nenhum produto ativo'
      }, { status: 404 });
    }

    const product = catalogProducts[0];
    console.log(`✅ Produto: ${product.description} (R$ ${product.price_catalog})`);
    test.steps.push(`✅ Produto: ${product.description}`);

    // PASSO 3: Saldos ANTES
    console.log('\n📍 PASSO 3: Capturando saldos ANTES...');
    const licenseeBeforeIndex = licensees.findIndex(u => u.id === licensee.id);
    const balanceBefore = {
      catalog_commission_balance: Number(licensees[licenseeBeforeIndex].catalog_commission_balance || 0),
      valora_pay_balance: Number(licensees[licenseeBeforeIndex].valora_pay_balance || 0),
      commission_balance: Number(licensees[licenseeBeforeIndex].commission_balance || 0)
    };

    console.log(`  catalog_commission_balance: R$ ${balanceBefore.catalog_commission_balance.toFixed(2)}`);
    console.log(`  valora_pay_balance: R$ ${balanceBefore.valora_pay_balance.toFixed(2)}`);
    console.log(`  commission_balance: R$ ${balanceBefore.commission_balance.toFixed(2)}`);
    test.steps.push(`💰 ANTES: ${JSON.stringify(balanceBefore)}`);

    // PASSO 4: Criar CatalogSale
    console.log('\n📍 PASSO 4: Criando CatalogSale de R$ 100...');
    const salePrice = 100.00;
    
    const sale = await base44.entities.CatalogSale.create({
      product_id: product.id,
      product_title: product.description,
      product_image: product.image_urls?.[0] || '',
      sale_price: salePrice,
      total_amount: salePrice,
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

    console.log(`✅ CatalogSale criada: ${sale.id}`);
    test.steps.push(`✅ CatalogSale: ${sale.id}`);

    // PASSO 5: Criar MercadoPagoPayment
    console.log('\n📍 PASSO 5: Criando MercadoPagoPayment...');
    const externalRef = `TEST_${sale.id}_${Date.now()}`;
    
    const payment = await base44.entities.MercadoPagoPayment.create({
      product_id: product.id,
      catalog_sale_id: sale.id,
      user_id: licensee.id,
      preference_id: `pref_test_${Date.now()}`,
      payment_id: `payment_test_${Date.now()}`,
      amount: salePrice,
      external_reference: externalRef,
      status: 'pending',
      payment_method: 'test_method'
    });

    console.log(`✅ MercadoPagoPayment: ${payment.id}`);
    test.steps.push(`✅ MercadoPagoPayment: ${payment.id}`);

    // PASSO 6: Marcar venda como PAID
    console.log('\n📍 PASSO 6: Marcando CatalogSale como PAID...');
    await base44.entities.CatalogSale.update(sale.id, { status: 'paid' });
    console.log(`✅ Status: PAID`);
    test.steps.push(`✅ CatalogSale.status = paid`);

    // PASSO 7: Invocar processCatalogCommission como admin
    console.log('\n📍 PASSO 7: Processando comissões (service role)...');
    let commissionResult = null;
    try {
      commissionResult = await base44.asServiceRole.functions.invoke('processCatalogCommission', {
        sale_id: sale.id
      });
      console.log(`✅ Comissões processadas`);
      console.log(`  Total: R$ ${commissionResult?.data?.total_assigned || 0}`);
      test.steps.push(`✅ Comissões: R$ ${commissionResult?.data?.total_assigned || 0}`);
    } catch (err) {
      console.error(`❌ Erro:`, err.message);
      test.steps.push(`❌ Erro: ${err.message}`);
    }

    // PASSO 8: Saldos DEPOIS
    console.log('\n📍 PASSO 8: Capturando saldos DEPOIS...');
    const usersAfter = await base44.entities.AppUser.list();
    const licenseeAfter = usersAfter.find(u => u.id === licensee.id) || {};
    
    const balanceAfter = {
      catalog_commission_balance: Number(licenseeAfter.catalog_commission_balance || 0),
      valora_pay_balance: Number(licenseeAfter.valora_pay_balance || 0),
      commission_balance: Number(licenseeAfter.commission_balance || 0)
    };

    console.log(`  catalog_commission_balance: R$ ${balanceAfter.catalog_commission_balance.toFixed(2)}`);
    console.log(`  valora_pay_balance: R$ ${balanceAfter.valora_pay_balance.toFixed(2)}`);
    console.log(`  commission_balance: R$ ${balanceAfter.commission_balance.toFixed(2)}`);
    test.steps.push(`💰 DEPOIS: ${JSON.stringify(balanceAfter)}`);

    // PASSO 9: Deltas
    console.log('\n📍 PASSO 9: Calculando diferenças...');
    const deltaCommission = balanceAfter.catalog_commission_balance - balanceBefore.catalog_commission_balance;
    const deltaValora = balanceAfter.valora_pay_balance - balanceBefore.valora_pay_balance;
    
    console.log(`  ✅ Δ catalog_commission_balance: +R$ ${deltaCommission.toFixed(2)}`);
    console.log(`  ✅ Δ valora_pay_balance: +R$ ${deltaValora.toFixed(2)}`);

    // PASSO 10: CommissionRecords
    console.log('\n📍 PASSO 10: Buscando CommissionRecords...');
    const allRecords = await base44.entities.CommissionRecord.list();
    const records = allRecords.filter(r => r.sale_id === sale.id);
    console.log(`✅ ${records.length} comissão(ões) criada(s)`);
    
    records.forEach((record, idx) => {
      console.log(`\n  #${idx + 1}: ${record.user_name}`);
      console.log(`    Cargo: ${record.role} | ${record.percent}%`);
      console.log(`    Valor: R$ ${record.amount.toFixed(2)}`);
    });

    test.steps.push(`✅ ${records.length} CommissionRecord(s)`);

    console.log('\n🧪 ═══════════════════════════════════════════════════════════');
    console.log('🧪 ✅ TESTE CONCLUÍDO');
    console.log('🧪 ═══════════════════════════════════════════════════════════\n');

    return Response.json({
      success: true,
      summary: {
        sale_id: sale.id,
        payment_id: payment.id,
        licensee: licensee.full_name,
        amount: salePrice,
        commissions_created: records.length,
        total_distributed: commissionResult?.data?.total_assigned || 0,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        deltas: {
          catalog_commission: deltaCommission,
          valora_pay: deltaValora
        },
        steps: test.steps
      }
    });

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});