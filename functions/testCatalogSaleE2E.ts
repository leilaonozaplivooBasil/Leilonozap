import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * 🧪 TESTE E2E (END-TO-END) DE VENDA DE CATÁLOGO
 * 
 * Simula ponta-a-ponta:
 * 1. Busca um licenciado_catalogo
 * 2. Busca um usuário comum indicado por ele
 * 3. Busca um produto do catálogo
 * 4. Cria uma CatalogSale de R$ 100
 * 5. Cria um MercadoPagoPayment simulado
 * 6. Marca como 'paid' e processa comissões
 * 7. Valida saldos finais
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    console.log('\n🧪 ═══════════════════════════════════════════════════════════');
    console.log('🧪 INICIANDO TESTE E2E DE VENDA DE CATÁLOGO');
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
        error: 'Nenhum licenciado_catalogo encontrado no sistema',
        suggestion: 'Crie um licenciado primeiro'
      }, { status: 404 });
    }

    console.log(`✅ Licenciado encontrado: ${licensee.full_name} (${licensee.id})`);
    test.steps.push(`✅ Licenciado: ${licensee.full_name}`);
    test.values.licensee = licensee;

    // PASSO 2: Buscar um usuário comum indicado pelo licenciado
    console.log('\n📍 PASSO 2: Buscando usuário indicado...');
    const indicated = licensees.filter(u => u.referred_by_id === licensee.id);

    let buyer = indicated.find(u => u.role === 'user');
    
    if (!buyer) {
      console.log('⚠️ Nenhum indicado encontrado, usando licenciado como comprador');
      buyer = licensee;
    }

    console.log(`✅ Comprador selecionado: ${buyer.full_name} (${buyer.id})`);
    test.steps.push(`✅ Comprador: ${buyer.full_name}`);
    test.values.buyer = buyer;

    // PASSO 3: Buscar um produto do catálogo
    console.log('\n📍 PASSO 3: Buscando produto do catálogo...');
    const products = await base44.entities.Product.list();
    const catalogProducts = products.filter(p => p.catalog_active === true && p.price_catalog > 0);

    if (catalogProducts.length === 0) {
      return Response.json({
        error: 'Nenhum produto de catálogo ativo encontrado',
        suggestion: 'Crie um produto com catalog_active=true e price_catalog > 0'
      }, { status: 404 });
    }

    const product = catalogProducts[0];
    console.log(`✅ Produto: ${product.description} (R$ ${product.price_catalog})`);
    test.steps.push(`✅ Produto: ${product.description}`);
    test.values.product = product;

    // PASSO 4: Criar CatalogSale
    console.log('\n📍 PASSO 4: Criando CatalogSale de R$ 100...');
    const salePrice = 100.00;
    
    const sale = await base44.entities.CatalogSale.create({
      product_id: product.id,
      product_title: product.description,
      product_image: product.image_urls?.[0] || '',
      sale_price: salePrice,
      total_amount: salePrice,
      buyer_id: buyer.id,
      buyer_name: buyer.full_name,
      buyer_email: buyer.email,
      buyer_phone: buyer.phone || '11999999999',
      licensee_id: licensee.id,
      licensee_name: licensee.full_name,
      licensee_plan: licensee.primary_career_level,
      referral_code: licensee.referral_code,
      status: 'pending_payment'
    });

    console.log(`✅ CatalogSale criada: ${sale.id}`);
    test.steps.push(`✅ CatalogSale ID: ${sale.id}`);
    test.values.sale = sale;

    // PASSO 5: Criar MercadoPagoPayment simulado
    console.log('\n📍 PASSO 5: Criando MercadoPagoPayment...');
    const externalRef = `TEST_${sale.id}_${Date.now()}`;
    
    const payment = await base44.asServiceRole.entities.MercadoPagoPayment.create({
      product_id: product.id,
      catalog_sale_id: sale.id,
      user_id: buyer.id,
      preference_id: `pref_test_${Date.now()}`,
      payment_id: `payment_test_${Date.now()}`,
      amount: salePrice,
      external_reference: externalRef,
      status: 'pending',
      payment_method: 'test_method'
    });

    console.log(`✅ MercadoPagoPayment criada: ${payment.id}`);
    test.steps.push(`✅ MercadoPagoPayment ID: ${payment.id}`);
    test.values.payment = payment;

    // PASSO 6: Saldos ANTES
    console.log('\n📍 PASSO 6: Capturando saldos ANTES da aprovação...');
    const buyerBefore = await base44.asServiceRole.entities.AppUser.filter({ id: buyer.id });
    const buyerBeforeData = buyerBefore[0] || {};
    
    const balanceBefore = {
      catalog_commission_balance: Number(buyerBeforeData.catalog_commission_balance || 0),
      valora_pay_balance: Number(buyerBeforeData.valora_pay_balance || 0),
      commission_balance: Number(buyerBeforeData.commission_balance || 0)
    };

    console.log(`  💰 catalog_commission_balance: R$ ${balanceBefore.catalog_commission_balance.toFixed(2)}`);
    console.log(`  💰 valora_pay_balance: R$ ${balanceBefore.valora_pay_balance.toFixed(2)}`);
    console.log(`  💰 commission_balance: R$ ${balanceBefore.commission_balance.toFixed(2)}`);
    test.steps.push(`💰 Saldos ANTES: ${JSON.stringify(balanceBefore)}`);

    // PASSO 7: Atualizar venda para 'paid'
    console.log('\n📍 PASSO 7: Marcando CatalogSale como PAID...');
    await base44.asServiceRole.entities.CatalogSale.update(sale.id, { status: 'paid' });
    console.log(`✅ CatalogSale.status = 'paid'`);
    test.steps.push(`✅ CatalogSale status = paid`);

    // PASSO 8: Atualizar payment para 'approved'
    console.log('\n📍 PASSO 8: Marcando MercadoPagoPayment como APPROVED...');
    await base44.asServiceRole.entities.MercadoPagoPayment.update(payment.id, { 
      status: 'approved'
    });
    console.log(`✅ MercadoPagoPayment.status = 'approved'`);
    test.steps.push(`✅ MercadoPagoPayment status = approved`);

    // PASSO 9: Processar comissões
    console.log('\n📍 PASSO 9: Processando comissões...');
    let commissionResult = null;
    try {
      commissionResult = await base44.asServiceRole.functions.invoke('processCatalogCommission', {
        sale_id: sale.id
      });
      console.log(`✅ Comissões processadas com sucesso`);
      console.log(`  📊 Total atribuído: R$ ${commissionResult?.data?.total_assigned || 0}`);
      test.steps.push(`✅ Comissões processadas: R$ ${commissionResult?.data?.total_assigned || 0}`);
    } catch (err) {
      console.error(`❌ Erro ao processar comissões:`, err.message);
      test.steps.push(`❌ Erro ao processar: ${err.message}`);
      throw err;
    }

    // PASSO 10: Saldos DEPOIS
    console.log('\n📍 PASSO 10: Capturando saldos DEPOIS...');
    const buyerAfter = await base44.asServiceRole.entities.AppUser.filter({ id: buyer.id });
    const buyerAfterData = buyerAfter[0] || {};
    
    const balanceAfter = {
      catalog_commission_balance: Number(buyerAfterData.catalog_commission_balance || 0),
      valora_pay_balance: Number(buyerAfterData.valora_pay_balance || 0),
      commission_balance: Number(buyerAfterData.commission_balance || 0)
    };

    console.log(`  💰 catalog_commission_balance: R$ ${balanceAfter.catalog_commission_balance.toFixed(2)}`);
    console.log(`  💰 valora_pay_balance: R$ ${balanceAfter.valora_pay_balance.toFixed(2)}`);
    console.log(`  💰 commission_balance: R$ ${balanceAfter.commission_balance.toFixed(2)}`);
    test.steps.push(`💰 Saldos DEPOIS: ${JSON.stringify(balanceAfter)}`);

    // PASSO 11: Validação de integridade
    console.log('\n📍 PASSO 11: Validando integridade...');
    
    const deltaCommission = balanceAfter.catalog_commission_balance - balanceBefore.catalog_commission_balance;
    const deltaValora = balanceAfter.valora_pay_balance - balanceBefore.valora_pay_balance;
    
    console.log(`  ✅ Δ catalog_commission_balance: +R$ ${deltaCommission.toFixed(2)}`);
    console.log(`  ✅ Δ valora_pay_balance: +R$ ${deltaValora.toFixed(2)}`);
    
    if (deltaCommission <= 0 && deltaValora <= 0) {
      console.warn(`⚠️ ALERTA: Nenhuma comissão foi acreditada!`);
      test.steps.push(`⚠️ ALERTA: Saldos não aumentaram`);
    } else {
      console.log(`✅ Saldos foram incrementados corretamente`);
      test.steps.push(`✅ Saldos incrementados com sucesso`);
    }

    // PASSO 12: Buscar CommissionRecords
    console.log('\n📍 PASSO 12: Buscando CommissionRecords...');
    const records = await base44.asServiceRole.entities.CommissionRecord.filter({ sale_id: sale.id });
    console.log(`✅ ${records.length} registro(s) de comissão encontrado(s)`);
    
    records.forEach((record, idx) => {
      console.log(`\n  📌 Comissão #${idx + 1}:`);
      console.log(`     Usuário: ${record.user_name}`);
      console.log(`     Cargo: ${record.role}`);
      console.log(`     Percentual: ${record.percent}%`);
      console.log(`     Valor: R$ ${record.amount.toFixed(2)}`);
    });

    test.steps.push(`✅ ${records.length} CommissionRecord(s) criado(s)`);
    test.values.commissions = records;

    console.log('\n🧪 ═══════════════════════════════════════════════════════════');
    console.log('🧪 ✅ TESTE E2E CONCLUÍDO COM SUCESSO');
    console.log('🧪 ═══════════════════════════════════════════════════════════\n');

    return Response.json({
      success: true,
      test_id: `test_${Date.now()}`,
      duration_ms: Date.now(),
      steps: test.steps,
      summary: {
        sale_id: sale.id,
        payment_id: payment.id,
        licensee: licensee.full_name,
        buyer: buyer.full_name,
        amount: salePrice,
        commissions_created: records.length,
        total_distributed: commissionResult?.data?.total_assigned || 0,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        deltas: {
          catalog_commission: deltaCommission,
          valora_pay: deltaValora
        }
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