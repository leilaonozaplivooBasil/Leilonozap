import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * 🧪 TESTE DE STRESS - SIMULA ALTA CONCORRÊNCIA
 * Testa se o sistema aguenta múltiplos usuários simultâneos
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const { concurrent_users = 100 } = await req.json();

  console.log(`🧪 [STRESS TEST] Iniciando teste com ${concurrent_users} usuários simultâneos...`);

  const startTime = Date.now();
  const results = {
    total_requests: 0,
    successful: 0,
    failed: 0,
    rate_limited: 0,
    conflicts: 0,
    avg_response_time: 0,
    errors: []
  };

  try {
    // 1️⃣ BUSCA LEILÕES ATIVOS
    const activeAuctions = await base44.asServiceRole.entities.Auction.filter({ 
      status: 'active' 
    });

    if (activeAuctions.length === 0) {
      return Response.json({ 
        error: 'Nenhum leilão ativo para testar' 
      }, { status: 400 });
    }

    const testAuction = activeAuctions[0];
    console.log(`🎯 [STRESS TEST] Testando leilão: ${testAuction.title}`);

    // 2️⃣ BUSCA USUÁRIOS PARA SIMULAR
    const allUsers = await base44.asServiceRole.entities.AppUser.list('-created_date', concurrent_users);
    const testUsers = allUsers.slice(0, Math.min(concurrent_users, allUsers.length));

    console.log(`👥 [STRESS TEST] ${testUsers.length} usuários prontos`);

    // 3️⃣ SIMULA LANCES CONCORRENTES
    const bidPromises = testUsers.map(async (testUser, index) => {
      const delay = Math.random() * 2000; // Distribui em 2s
      await new Promise(resolve => setTimeout(resolve, delay));

      const bidAmount = (testAuction.current_price || testAuction.starting_price) + 
                        testAuction.increment + 
                        (Math.random() * 50);

      const requestStart = Date.now();

      try {
        results.total_requests++;

        // Simula criação de mensagem de lance
        await base44.asServiceRole.entities.AuctionMessage.create({
          auction_id: testAuction.id,
          message_type: "bid",
          sender_id: testUser.id,
          content: `[TEST] Lance de R$ ${bidAmount.toFixed(2)}`,
          sender_name: testUser.nickname || testUser.full_name,
          bid_amount: bidAmount,
          is_system_message: false
        });

        const responseTime = Date.now() - requestStart;
        results.successful++;
        results.avg_response_time += responseTime;

        return { success: true, responseTime };

      } catch (error) {
        results.failed++;
        
        const errorMsg = error.message || '';
        if (errorMsg.includes('429') || errorMsg.includes('Rate limit')) {
          results.rate_limited++;
        } else if (errorMsg.includes('conflict') || errorMsg.includes('version')) {
          results.conflicts++;
        }

        results.errors.push({
          user: testUser.id,
          error: errorMsg.substring(0, 100)
        });

        return { success: false, error: errorMsg };
      }
    });

    // 4️⃣ AGUARDA TODOS OS LANCES
    await Promise.all(bidPromises);

    // 5️⃣ CALCULA ESTATÍSTICAS
    if (results.successful > 0) {
      results.avg_response_time = Math.round(results.avg_response_time / results.successful);
    }

    const executionTime = Date.now() - startTime;
    const throughput = Math.round((results.total_requests / executionTime) * 1000);

    console.log(`✅ [STRESS TEST] Completo em ${executionTime}ms`);
    console.log(`📊 Sucessos: ${results.successful}/${results.total_requests}`);
    console.log(`⚡ Throughput: ${throughput} req/s`);

    // 6️⃣ LIMPA MENSAGENS DE TESTE
    console.log(`🧹 [STRESS TEST] Limpando mensagens de teste...`);
    const testMessages = await base44.asServiceRole.entities.AuctionMessage.filter({
      auction_id: testAuction.id
    });
    
    const testMsgIds = testMessages
      .filter(m => m.content && m.content.includes('[TEST]'))
      .map(m => m.id);

    for (const msgId of testMsgIds) {
      try {
        await base44.asServiceRole.entities.AuctionMessage.delete(msgId);
      } catch (e) {
        console.debug('Cleanup error:', e.message);
      }
    }

    return Response.json({
      success: true,
      test_config: {
        concurrent_users: testUsers.length,
        auction_tested: testAuction.title
      },
      results: {
        ...results,
        execution_time_ms: executionTime,
        throughput_per_second: throughput,
        success_rate: `${Math.round((results.successful / results.total_requests) * 100)}%`
      }
    });

  } catch (error) {
    console.error("❌ [STRESS TEST] Erro:", error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});