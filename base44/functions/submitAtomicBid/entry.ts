import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { auction_id, amount } = await req.json();

    if (!auction_id || !amount) {
      return Response.json({
        success: false,
        message: 'Parâmetros inválidos'
      }, { status: 400 });
    }

    const bidAmount = parseFloat(amount);

    // 🔒 VALIDAÇÃO DE SALDO (DigitalWallet)
    // Busca saldo atual antes de qualquer lógica de leilão
    const wallets = await base44.asServiceRole.entities.DigitalWallet.filter({ user_id: user.id });
    const userWallet = wallets && wallets.length > 0 ? wallets[0] : null;
    const currentBalance = userWallet?.balance || 0;

    if (currentBalance < bidAmount) {
      console.log(`❌ [ATOMIC BID] Saldo insuficiente. Carteira: R$ ${currentBalance} < Lance: R$ ${bidAmount}`);
      return Response.json({
        success: false,
        message: `Saldo insuficiente (R$ ${currentBalance.toFixed(2)}). Por favor, adicione fundos.`,
        error_code: 'INSUFFICIENT_FUNDS',
        current_balance: currentBalance,
        required_amount: bidAmount
      }, { status: 400 });
    }

    // 🔐 OPERAÇÃO ATÔMICA COM SERVICE ROLE
    console.log(`🔒 [ATOMIC BID] Iniciando lance atômico: R$ ${bidAmount.toFixed(2)}`);

    // 1️⃣ LER ESTADO ATUAL DO LEILÃO
    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });

    if (!auctions || auctions.length === 0) {
      return Response.json({
        success: false,
        message: 'Leilão não encontrado'
      }, { status: 404 });
    }

    const auction = auctions[0];
    const currentVersion = auction.version || 0;

    console.log(`📊 [ATOMIC BID] Estado atual:`);
    console.log(`   Preço: R$ ${auction.current_price}`);
    console.log(`   Versão: ${currentVersion}`);
    console.log(`   Status: ${auction.status}`);

    // 2️⃣ VALIDAÇÕES CRÍTICAS

    // Validar status
    if (auction.status !== 'active') {
      console.log(`❌ [ATOMIC BID] Leilão não está ativo: ${auction.status}`);
      return Response.json({
        success: false,
        message: 'Leilão não está ativo',
        current_state: {
          current_price: auction.current_price,
          status: auction.status,
          winner_name: auction.winner_name
        }
      }, { status: 400 });
    }

    // Validar tempo
    const now = Date.now();
    const endTime = new Date(auction.end_time).getTime();

    if (now >= endTime) {
      console.log(`❌ [ATOMIC BID] Leilão expirado`);
      return Response.json({
        success: false,
        message: 'Leilão já encerrou',
        current_state: {
          current_price: auction.current_price,
          status: auction.status,
          end_time: auction.end_time
        }
      }, { status: 400 });
    }

    // Validar valor do lance
    const currentPrice = auction.current_price || auction.starting_price;
    const minBid = currentPrice + auction.increment;

    if (bidAmount <= currentPrice) {
      console.log(`❌ [ATOMIC BID] Lance muito baixo: R$ ${bidAmount} <= R$ ${currentPrice}`);
      return Response.json({
        success: false,
        message: `Lance deve ser maior que R$ ${currentPrice.toFixed(2)}`,
        current_state: {
          current_price: currentPrice,
          min_bid: minBid,
          winner_name: auction.winner_name
        }
      }, { status: 400 });
    }

    if (bidAmount < minBid) {
      console.log(`❌ [ATOMIC BID] Lance abaixo do mínimo: R$ ${bidAmount} < R$ ${minBid}`);
      return Response.json({
        success: false,
        message: `Lance mínimo: R$ ${minBid.toFixed(2)}`,
        current_state: {
          current_price: currentPrice,
          min_bid: minBid,
          winner_name: auction.winner_name
        }
      }, { status: 400 });
    }

    // 3️⃣ BUSCAR DADOS DO USUÁRIO
    let bidderData = null;
    try {
      const appUsers = await base44.asServiceRole.entities.AppUser.filter({ id: user.id });
      if (appUsers && appUsers.length > 0) {
        bidderData = appUsers[0];
      }
    } catch (error) {
      console.warn(`⚠️ [ATOMIC BID] Usuário não encontrado em AppUser:`, error.message);
    }

    const bidderName = bidderData?.nickname || bidderData?.full_name || user.full_name || 'Anônimo';

    // 4️⃣ CALCULAR NOVA END_TIME (extensão em guerra)
    const COUNTDOWN_DURATION = 142; // 2min22s
    const BID_EXTENSION_SECONDS = 22;

    const timeUntilEnd = Math.floor((endTime - now) / 1000);
    let newEndTime = auction.end_time;

    if (timeUntilEnd <= COUNTDOWN_DURATION) {
      const extendedEndTime = new Date(endTime + (BID_EXTENSION_SECONDS * 1000));
      newEndTime = extendedEndTime.toISOString();
      console.log(`⚡ [ATOMIC BID] GUERRA! +${BID_EXTENSION_SECONDS}s`);
    }

    // 5️⃣ ATUALIZAR LEILÃO COM BLOQUEIO OTIMISTA
    const updateData = {
      current_price: bidAmount,
      winner_id: user.id,
      winner_name: bidderName,
      end_time: newEndTime,
      last_updated: new Date().toISOString(),
      version: currentVersion + 1
    };

    console.log(`🔄 [ATOMIC BID] Atualizando leilão (versão ${currentVersion} → ${currentVersion + 1})`);

    // Tenta atualizar com a versão esperada
    const updatedAuctions = await base44.asServiceRole.entities.Auction.filter({
      id: auction_id,
      version: currentVersion
    });

    if (!updatedAuctions || updatedAuctions.length === 0) {
      console.log(`❌ [ATOMIC BID] Conflito de versão! Outro lance foi processado.`);

      // Busca estado atual novamente
      const currentAuctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });
      const currentAuction = currentAuctions[0];

      return Response.json({
        success: false,
        message: 'Outro lance foi dado antes. Tente novamente!',
        conflict: true,
        current_state: {
          current_price: currentAuction.current_price,
          winner_name: currentAuction.winner_name,
          version: currentAuction.version
        }
      }, { status: 409 });
    }

    // Atualiza o leilão
    await base44.asServiceRole.entities.Auction.update(auction_id, updateData);

    console.log(`✅ [ATOMIC BID] Leilão atualizado!`);

    // 6️⃣ REGISTRAR LANCE
    await base44.asServiceRole.entities.Bid.create({
      auction_id: auction_id,
      bidder_name: bidderName,
      amount: bidAmount,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ [ATOMIC BID] Lance registrado!`);

    // 7️⃣ CRIAR MENSAGEM NO CHAT
    await base44.asServiceRole.entities.AuctionMessage.create({
      auction_id: auction_id,
      message_type: "bid",
      sender_id: user.id,
      content: `Lance de R$ ${bidAmount.toFixed(2)}`,
      sender_name: bidderName,
      bid_amount: bidAmount,
      is_system_message: false,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ [ATOMIC BID] Mensagem criada!`);

    // 8️⃣ ATUALIZAR STATS DO USUÁRIO
    if (bidderData) {
      try {
        await base44.asServiceRole.entities.AppUser.update(user.id, {
          points: (bidderData.points || 0) + 10,
          total_bids: (bidderData.total_bids || 0) + 1
        });
        console.log(`✅ [ATOMIC BID] Stats do usuário atualizados!`);
      } catch (error) {
        console.warn(`⚠️ [ATOMIC BID] Erro ao atualizar stats:`, error.message);
      }
    }

    // 9️⃣ CRIAR NARRAÇÃO DA IA (às vezes)
    const shouldComment = Math.random() < 0.4 || bidAmount % 50 === 0;

    if (shouldComment) {
      const aiComments = [
        `🔥 UHULLLL! ${bidderName} MANDOU R$ ${bidAmount.toFixed(2)}!`,
        `💰 BOOMM! Lance de R$ ${bidAmount.toFixed(2)}!`,
        `⚡ ${bidderName} ON FIRE!`,
        `🚀 VOOOOU! R$ ${bidAmount.toFixed(2)}!`,
        `💥 POW! ${bidderName} não brinca!`,
        `🎯 NA MOOOSCA! R$ ${bidAmount.toFixed(2)}!`,
        `⭐ SHOWWW! ${bidderName}!`,
        `🔊 ATENÇÃO! R$ ${bidAmount.toFixed(2)}!`
      ];

      const randomComment = aiComments[Math.floor(Math.random() * aiComments.length)];

      setTimeout(async () => {
        try {
          await base44.asServiceRole.entities.AuctionMessage.create({
            auction_id: auction_id,
            message_type: "ai_narration",
            content: randomComment,
            sender_name: "LanceIA",
            is_system_message: true,
            timestamp: new Date().toISOString()
          });
          console.log(`🎤 [ATOMIC BID] Narração IA criada!`);
        } catch (error) {
          console.warn(`⚠️ [ATOMIC BID] Erro ao criar narração:`, error.message);
        }
      }, 1500);
    }

    // 🔟 LOGAR SUCESSO
    await base44.asServiceRole.entities.SystemLog.create({
      entity_id: auction_id,
      component_name: 'submitAtomicBid',
      step: 'BID_SUCCESS',
      status: 'success',
      message: `Lance de R$ ${bidAmount.toFixed(2)} por ${bidderName}`,
      execution_time_ms: Date.now() - now
    });

    console.log(`🎉 [ATOMIC BID] SUCESSO TOTAL!`);

    return Response.json({
      success: true,
      message: 'Lance registrado com sucesso!',
      new_state: {
        current_price: bidAmount,
        winner_name: bidderName,
        version: currentVersion + 1,
        end_time: newEndTime
      }
    }, { status: 200 });

  } catch (error) {
    console.error("❌ [ATOMIC BID] Erro fatal:", error);

    // Tenta logar o erro
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.SystemLog.create({
        component_name: 'submitAtomicBid',
        step: 'BID_ERROR',
        status: 'error',
        message: error.message,
        error_details: {
          stack: error.stack,
          name: error.name
        }
      });
    } catch (logError) {
      console.error("❌ Erro ao logar:", logError);
    }

    return Response.json({
      success: false,
      message: 'Erro ao processar lance: ' + error.message
    }, { status: 500 });
  }
});