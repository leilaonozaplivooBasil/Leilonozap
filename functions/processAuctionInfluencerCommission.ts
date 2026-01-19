import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Processa comissão de 3% para o Influencer que indicou o arrematante
 * Regra: Venda pelo App → 3% para Influencer
 * Sem link → comissão vai para "Leilão NoZap – Site Oficial"
 */

async function findUserById(base44, id) {
  if (!id) return null;
  const rows = await base44.asServiceRole.entities.AppUser.filter({ id });
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function getOrCreateSiteOfficial(base44) {
  // Tenta por email primeiro
  const byEmail = await base44.asServiceRole.entities.AppUser.filter({ email: 'site@leilaonozap.com' });
  if (Array.isArray(byEmail) && byEmail.length) return byEmail[0];

  // Tenta por nome
  const possible = await base44.asServiceRole.entities.AppUser.filter({ full_name: 'Leilão NoZap - Site Oficial' });
  if (Array.isArray(possible) && possible.length) return possible[0];

  // Cria se não existir
  const created = await base44.asServiceRole.entities.AppUser.create({
    full_name: 'Leilão NoZap - Site Oficial',
    email: 'site@leilaonozap.com',
    password: 'site_official_2024',
    phone: '0000000000',
    role: 'admin',
    referral_code: 'site_official',
    nickname: 'Site Oficial',
    terms_accepted: true,
    career_levels: ['fundador', 'ceo', 'diretor', 'diretoria', 'conselheiro']
  });
  return created;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    
    // Permite chamada via automação ou admin
    const isAutomation = !!payload?.event;
    const user = await base44.auth.me().catch(() => null);
    if (!isAutomation && (!user || user.role !== 'admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const auctionId = payload?.auction_id || payload?.event?.entity_id;
    if (!auctionId) {
      return Response.json({ error: 'Missing auction_id' }, { status: 400 });
    }

    // Idempotência: verifica se já processou
    const existing = await base44.asServiceRole.entities.CommissionRecord.filter({ 
      sale_id: auctionId,
      role: 'influencer_app'
    });
    if (Array.isArray(existing) && existing.length > 0) {
      return Response.json({ success: true, already_processed: true, record: existing[0] });
    }

    // Busca leilão
    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
    const auction = Array.isArray(auctions) && auctions.length ? auctions[0] : null;
    if (!auction) {
      return Response.json({ error: 'Auction not found' }, { status: 404 });
    }

    // Só processa se tiver vencedor e valor final
    if (!auction.winner_id || auction.status === 'active') {
      return Response.json({ success: true, skipped: true, reason: 'Auction not finished or no winner' });
    }

    const finalPrice = Number(auction.current_price || 0);
    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
      return Response.json({ error: 'Invalid auction price' }, { status: 400 });
    }

    // Busca o arrematante (winner)
    const winner = await findUserById(base44, auction.winner_id);
    if (!winner) {
      return Response.json({ error: 'Winner not found' }, { status: 404 });
    }

    // Identifica o Influencer que indicou o arrematante
    let influencer = null;
    
    if (winner.referred_by_id) {
      influencer = await findUserById(base44, winner.referred_by_id);
    }
    
    // Sem indicação → Site Oficial recebe
    if (!influencer) {
      influencer = await getOrCreateSiteOfficial(base44);
    }

    // Calcula 3%
    const INFLUENCER_PERCENT = 3.0;
    const commissionAmount = +(finalPrice * (INFLUENCER_PERCENT / 100)).toFixed(2);

    if (commissionAmount <= 0) {
      return Response.json({ success: true, skipped: true, reason: 'Commission too small' });
    }

    // Cria registro de comissão
    const record = {
      sale_id: auctionId,
      user_id: influencer.id,
      role: 'influencer_app',
      percent: INFLUENCER_PERCENT,
      amount: commissionAmount,
      status: 'pending',
      sale_type: 'auction'
    };

    await base44.asServiceRole.entities.CommissionRecord.create(record);

    // Atualiza saldo do Influencer
    const currentBalance = Number(influencer.commission_balance || 0);
    const currentTotal = Number(influencer.total_commissions_generated || 0);
    const currentValora = Number(influencer.valora_pay_balance || 0);

    await base44.asServiceRole.entities.AppUser.update(influencer.id, {
      commission_balance: +(currentBalance + commissionAmount).toFixed(2),
      total_commissions_generated: +(currentTotal + commissionAmount).toFixed(2),
      valora_pay_balance: +(currentValora + commissionAmount).toFixed(2)
    });

    console.log(`✅ Comissão App processada: R$${commissionAmount} para ${influencer.full_name} (${influencer.id})`);

    return Response.json({
      success: true,
      auction_id: auctionId,
      final_price: finalPrice,
      influencer_id: influencer.id,
      influencer_name: influencer.full_name,
      commission_percent: INFLUENCER_PERCENT,
      commission_amount: commissionAmount
    });

  } catch (error) {
    console.error('❌ Erro ao processar comissão de leilão:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});