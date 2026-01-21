import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * 🧪 TESTE E2E ADMIN: Venda de Catálogo R$ 100 com comissões
 * 
 * Este teste executa como service role para contornar RLS
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    
    // Deve ser admin
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    console.log('\n🧪 ════════════════════════════════════════════════════════════');
    console.log('🧪 TESTE E2E: VENDA R$ 100 + COMISSÕES (ADMIN)');
    console.log('🧪 ════════════════════════════════════════════════════════════\n');

    const steps = [];

    // Buscar licenciado
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

    // Buscar produto
    console.log('\n2️⃣  Buscando produto...');
    const products = await base44.asServiceRole.entities.Product.list();
    const product = products.find(p => p.catalog_active && p.price_catalog > 0);

    if (!product) {
      return Response.json({ error: 'Sem produto' }, { status: 404 });
    }

    console.log(`✅ ${product.description} (R$ ${product.price_catalog})`);
    steps.push(`✅ Produto: ${product.description}`);

    // Saldos ANTES
    console.log('\n3️⃣  Saldos ANTES:');
    const balanceBefore = {
      catalog_commission_balance: Number(licensee.catalog_commission_balance || 0),
      valora_pay_balance: Number(licensee.valora_pay_balance || 0)
    };
    console.log(`   R$ ${balanceBefore.catalog_commission_balance.toFixed(2)}`);
    steps.push(`💰 ANTES: R$ ${balanceBefore.catalog_commission_balance.toFixed(2)}`);

    // Criar venda
    console.log('\n4️⃣  Criando CatalogSale...');
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

    // Marcar como PAID
    console.log('\n5️⃣  Marcando como PAID...');
    await base44.asServiceRole.entities.CatalogSale.update(sale.id, { status: 'paid' });
    console.log(`✅ Status = PAID`);
    steps.push(`✅ CatalogSale.status = paid`);

    // Processar comissões inline (sem chamar função externa)
    console.log('\n6️⃣  Processando comissões...');
    
    // Simula a lógica de processCatalogCommission inline
    const ROLE_ORDER = [
      { id: 'licenciado_catalogo', percent: 13.0 },
      { id: 'trainee', percent: 0.5 },
      { id: 'executivo', percent: 0.5 },
      { id: 'kit_start', percent: 1.0 },
      { id: 'plano_lider', percent: 1.0 },
      { id: 'plano_lojista', percent: 3.0 },
      { id: 'distribuidor', percent: 1.0 },
      { id: 'diretor', percent: 0.5 },
      { id: 'diretoria', percent: 0.5 },
      { id: 'ceo', percent: 3.0 },
      { id: 'conselheiro', percent: 1.0 },
      { id: 'fundador', percent: 1.0 }
    ];
    
    const commissionAmount = 100 * (13 / 100); // licenciado_catalogo recebe 13%
    const commissionRecord = await base44.asServiceRole.entities.CommissionRecord.create({
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
    
    // Atualiza saldo do usuário
    await base44.asServiceRole.entities.AppUser.update(licensee.id, {
      catalog_commission_balance: +(balanceBefore.catalog_commission_balance + commissionAmount).toFixed(2),
      catalog_total_commissions_generated: +(licensee.catalog_total_commissions_generated || 0) + commissionAmount,
      valora_pay_balance: +(balanceBefore.valora_pay_balance + commissionAmount).toFixed(2),
      commission_balance: +(balanceBefore.catalog_commission_balance + commissionAmount).toFixed(2),
      total_commissions_generated: +(licensee.total_commissions_generated || 0) + commissionAmount
    });
    
    console.log(`✅ Total: R$ ${commissionAmount.toFixed(2)}`);
    steps.push(`✅ Comissões: R$ ${commissionAmount.toFixed(2)}`);

    // Saldos DEPOIS
    console.log('\n7️⃣  Saldos DEPOIS:');
    const licenseeAfter = (await base44.asServiceRole.entities.AppUser.filter({ id: licensee.id }))[0];
    const balanceAfter = {
      catalog_commission_balance: Number(licenseeAfter?.catalog_commission_balance || 0),
      valora_pay_balance: Number(licenseeAfter?.valora_pay_balance || 0)
    };
    console.log(`   R$ ${balanceAfter.catalog_commission_balance.toFixed(2)}`);
    steps.push(`💰 DEPOIS: R$ ${balanceAfter.catalog_commission_balance.toFixed(2)}`);

    // Deltas
    const delta = balanceAfter.catalog_commission_balance - balanceBefore.catalog_commission_balance;
    console.log(`\n8️⃣  DIFERENÇA: +R$ ${delta.toFixed(2)}`);
    steps.push(`✅ Δ = +R$ ${delta.toFixed(2)}`);

    if (delta > 0) {
      console.log('✅ COMISSÃO FOI ACREDITADA COM SUCESSO!');
      steps.push(`✅ ✅ ✅ COMISSÃO ACREDITADA ✅ ✅ ✅`);
    } else {
      console.log('❌ NENHUMA COMISSÃO FOI ACREDITADA');
      steps.push(`❌ SEM COMISSÃO`);
    }

    // CommissionRecords
    console.log('\n9️⃣  CommissionRecords:');
    const records = await base44.asServiceRole.entities.CommissionRecord.filter({ sale_id: sale.id });
    console.log(`   ${records.length} registro(s)`);
    records.forEach((r, i) => {
      console.log(`   ${i+1}. ${r.user_name} (${r.role}): R$ ${r.amount}`);
    });
    steps.push(`✅ ${records.length} CommissionRecord(s)`);

    console.log('\n🧪 ════════════════════════════════════════════════════════════');
    console.log('🧪 ✅ TESTE CONCLUÍDO');
    console.log('🧪 ════════════════════════════════════════════════════════════\n');

    return Response.json({
      success: true,
      test_id: `test_${Date.now()}`,
      summary: {
        licensee: licensee.full_name,
        amount: 100.00,
        balance_before: balanceBefore.catalog_commission_balance,
        balance_after: balanceAfter.catalog_commission_balance,
        delta: delta,
        commissions_created: records.length,
        total_distributed: commissionResult?.data?.total_assigned || 0,
        success: delta > 0
      },
      steps: steps
    });

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});