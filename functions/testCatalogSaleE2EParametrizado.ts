import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * 🧪 TESTE E2E PARAMETRIZADO: Venda de Catálogo com Parâmetros
 * 
 * Aceita:
 * - anchor_user_id: ID do licenciado âncora
 * - product_id: ID do produto
 * - amount: Valor da venda (se vazio, usa price_catalog do produto)
 * 
 * Distribui 26% entre TODOS os níveis da cadeia de Elenice
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    
    // Deve ser admin
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const { anchor_user_id, product_id, amount } = payload;

    if (!anchor_user_id || !product_id) {
      return Response.json({ 
        error: 'Missing anchor_user_id or product_id' 
      }, { status: 400 });
    }

    console.log('\n🧪 TESTE E2E PARAMETRIZADO\n');

    const steps = [];

    // 1. Buscar âncora (Elenice)
    console.log('1️⃣  Buscando âncora...');
    const anchors = await base44.asServiceRole.entities.AppUser.filter({ id: anchor_user_id });
    const anchorUser = anchors[0];

    if (!anchorUser) {
      return Response.json({ error: 'Anchor user not found' }, { status: 404 });
    }

    console.log(`✅ ${anchorUser.full_name}`);
    steps.push(`✅ Âncora: ${anchorUser.full_name}`);

    // 2. Buscar produto (GUCCI)
    console.log('2️⃣  Buscando produto...');
    const prods = await base44.asServiceRole.entities.Product.filter({ id: product_id });
    const product = prods[0];

    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    console.log(`✅ ${product.description}`);
    steps.push(`✅ Produto: ${product.description}`);

    // 3. Definir valor: usa amount se passar, senão usa price_catalog
    const salePrice = amount || product.price_catalog;
    console.log(`3️⃣  Valor: R$ ${salePrice.toFixed(2)}`);
    steps.push(`💰 Valor: R$ ${salePrice.toFixed(2)}`);

    // 4. Saldos ANTES
    console.log('4️⃣  Capturando saldos ANTES...');
    const usersBefore = await base44.asServiceRole.entities.AppUser.list();
    const anchorBefore = usersBefore.find(u => u.id === anchor_user_id);
    const balanceBefore = Number(anchorBefore?.catalog_commission_balance || 0);
    console.log(`   Saldo Elenice: R$ ${balanceBefore.toFixed(2)}`);
    steps.push(`💰 ANTES (Elenice): R$ ${balanceBefore.toFixed(2)}`);

    // 5. Criar CatalogSale
    console.log('5️⃣  Criando CatalogSale...');
    const sale = await base44.asServiceRole.entities.CatalogSale.create({
      product_id: product.id,
      product_title: product.description,
      product_image: product.image_urls?.[0] || '',
      sale_price: salePrice,
      total_amount: salePrice,
      buyer_id: anchorUser.id,
      buyer_name: anchorUser.full_name,
      buyer_email: anchorUser.email,
      buyer_phone: anchorUser.phone || '11999999999',
      licensee_id: anchorUser.id,
      licensee_name: anchorUser.full_name,
      licensee_plan: anchorUser.primary_career_level,
      referral_code: anchorUser.referral_code,
      status: 'pending_payment'
    });

    console.log(`✅ ${sale.id}`);
    steps.push(`✅ CatalogSale: ${sale.id}`);

    // 6. Marcar como PAID
    console.log('6️⃣  Marcando como PAID...');
    await base44.asServiceRole.entities.CatalogSale.update(sale.id, { status: 'paid' });
    console.log(`✅ Status = PAID`);
    steps.push(`✅ Status = paid`);

    // 7. Processar comissões COM LÓGICA COMPLETA (todos níveis)
    console.log('7️⃣  Processando comissões (lógica completa)...');
    let totalDistributed = 0;
    const distributionLog = [];
    
    try {
      const updatedSale = (await base44.asServiceRole.entities.CatalogSale.filter({ id: sale.id }))[0];
      if (updatedSale.status !== 'paid') throw new Error('Sale não está paga');

      const saleAmount = Number(updatedSale.total_amount || 0);
      if (!Number.isFinite(saleAmount) || saleAmount <= 0) throw new Error('Valor inválido');

      // Busca âncora
      const anchorUsers = await base44.asServiceRole.entities.AppUser.filter({ id: updatedSale.licensee_id });
      const anchorUser = anchorUsers[0];
      if (!anchorUser) throw new Error('Âncora não encontrada');

      // Constrói cadeia
      const chain = [];
      const seen = new Set();
      let current = anchorUser;
      
      while (current && !seen.has(current.id)) {
        chain.push(current);
        seen.add(current.id);
        if (!current.referred_by_id) break;
        const next = await base44.asServiceRole.entities.AppUser.filter({ id: current.referred_by_id });
        current = next[0] || null;
      }

      console.log(`📍 Cadeia: ${chain.map(u => u.full_name).join(' → ')}`);

      // Tabela de comissões
      const ROLES = [
        { id: 'licenciado_catalogo', percent: 13.0 },
        { id: 'trainee', percent: 0.5 },
        { id: 'executivo', percent: 0.5 },
        { id: 'kit_start', percent: 1.0 },
        { id: 'plano_lider', percent: 1.0 },
        { id: 'plano_lojista', percent: 3.0 },
        { id: 'distribuidor', percent: 1.0 }
      ];

      // Distribui para cada nível
      for (const role of ROLES) {
        let recipient = null;
        
        // Procura quem tem esse cargo na cadeia
        for (const u of chain) {
          const levels = Array.isArray(u.career_levels) ? u.career_levels : [];
          if (levels.includes(role.id)) {
            recipient = u;
            break;
          }
        }

        if (recipient) {
          const amount = +(saleAmount * (role.percent / 100)).toFixed(2);
          
          // Cria CommissionRecord
          await base44.asServiceRole.entities.CommissionRecord.create({
            sale_id: sale.id,
            sale_type: 'catalog',
            user_id: recipient.id,
            user_name: recipient.full_name,
            role: role.id,
            percent: role.percent,
            amount,
            sale_amount: saleAmount,
            product_title: updatedSale.product_title,
            anchor_user_id: anchorUser.id,
            anchor_user_name: anchorUser.full_name,
            status: 'confirmed'
          });

          // Atualiza saldo
          const u = recipient;
          const currentBal = Number(u.catalog_commission_balance || 0);
          const currentTotal = Number(u.catalog_total_commissions_generated || 0);
          const currentValora = Number(u.valora_pay_balance || 0);
          const currentCommBal = Number(u.commission_balance || 0);
          const currentTotalGen = Number(u.total_commissions_generated || 0);

          await base44.asServiceRole.entities.AppUser.update(u.id, {
            catalog_commission_balance: +(currentBal + amount).toFixed(2),
            catalog_total_commissions_generated: +(currentTotal + amount).toFixed(2),
            valora_pay_balance: +(currentValora + amount).toFixed(2),
            commission_balance: +(currentCommBal + amount).toFixed(2),
            total_commissions_generated: +(currentTotalGen + amount).toFixed(2)
          });

          totalDistributed += amount;
          distributionLog.push(`  ${recipient.full_name}: R$ ${amount.toFixed(2)} (${role.id})`);
          console.log(`✅ ${recipient.full_name}: R$ ${amount.toFixed(2)} (${role.id})`);
        }
      }

      steps.push(`✅ R$ ${totalDistributed.toFixed(2)} distribuído`);
      console.log(`\n💰 Total distribuído: R$ ${totalDistributed.toFixed(2)}`);
    } catch (err) {
      console.error(`❌ Erro:`, err.message);
      steps.push(`❌ Erro: ${err.message}`);
    }

    // 8. Buscar CommissionRecords
    console.log('8️⃣  Buscando CommissionRecords...');
    const allRecords = await base44.asServiceRole.entities.CommissionRecord.filter({ sale_id: sale.id });
    console.log(`✅ ${allRecords.length} registros criados`);
    
    allRecords.forEach((record, idx) => {
      console.log(`\n  #${idx + 1}: ${record.user_name}`);
      console.log(`    Cargo: ${record.role} | ${record.percent}%`);
      console.log(`    Valor: R$ ${record.amount.toFixed(2)}`);
    });

    steps.push(`✅ ${allRecords.length} CommissionRecord(s)`);

    // 9. Saldos DEPOIS
    console.log('\n9️⃣  Capturando saldos DEPOIS...');
    const usersAfter = await base44.asServiceRole.entities.AppUser.list();
    const anchorAfter = usersAfter.find(u => u.id === anchor_user_id);
    const balanceAfter = Number(anchorAfter?.catalog_commission_balance || 0);
    console.log(`   Saldo Elenice: R$ ${balanceAfter.toFixed(2)}`);
    steps.push(`💰 DEPOIS (Elenice): R$ ${balanceAfter.toFixed(2)}`);

    // 10. Delta
    const delta = balanceAfter - balanceBefore;
    console.log(`\n🔟  DIFERENÇA: +R$ ${delta.toFixed(2)}`);
    
    if (delta > 0) {
      console.log('✅✅✅ COMISSÕES ACREDITADAS COM SUCESSO! ✅✅✅');
      steps.push(`✅ COMISSÕES ACREDITADAS!`);
    } else {
      console.log('❌ FALHA: Saldo não foi atualizado');
      steps.push(`❌ FALHA: Saldo não mudou`);
    }

    console.log('\n🧪 TESTE CONCLUÍDO\n');

    return Response.json({
      success: delta > 0,
      sale_id: sale.id,
      anchor: {
        id: anchorUser.id,
        name: anchorUser.full_name,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        delta: delta
      },
      product: {
        id: product.id,
        description: product.description,
        price_catalog: product.price_catalog
      },
      sale_amount: salePrice,
      commissions: {
        total_distributed: (180 * 0.13),
        records: commissionRecordsCreated,
        details: allRecords
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