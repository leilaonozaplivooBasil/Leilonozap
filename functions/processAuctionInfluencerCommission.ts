import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Processa comissão de 3% para o Influencer quando um leilão é pago
 * Regra: Influencer ganha 3% sobre vendas do APLICATIVO
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
    role: 'admin',
    referral_code: 'site_official',
    nickname: 'Site Oficial',
    terms_accepted: true
  });
  return created;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    
    const auctionId = payload?.auction_id;
    if (!auctionId) {
      return Response.json({ error: 'Missing auction_id' }, { status: 400 });
    }

    // Busca o leilão
    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auctionId });
    const auction = Array.isArray(auctions) && auctions.length ? auctions[0] : null;
    
    if (!auction) {
      return Response.json({ error: 'Auction not found' }, { status: 404 });
    }

    // Verifica se já foi processado (idempotência)
    const existingCommissions = await base44.asServiceRole.entities.CommissionRecord.filter({ 
      sale_id: auctionId,
      sale_type: 'auction'
    });
    
    if (Array.isArray(existingCommissions) && existingCommissions.length > 0) {
      return Response.json({ success: true, already_processed: true, records: existingCommissions });
    }

    // Valor da venda
    const saleAmount = Number(auction.current_price || auction.buy_now_price || 0);
    if (!saleAmount || saleAmount <= 0) {
      return Response.json({ error: 'Invalid sale amount', auction_id: auctionId }, { status: 400 });
    }

    // Identifica o Influencer (quem indicou o vencedor)
    let influencer = null;
    
    if (auction.winner_id) {
      const winner = await findUserById(base44, auction.winner_id);
      if (winner && winner.referred_by_id) {
        influencer = await findUserById(base44, winner.referred_by_id);
      }
    }

    // Se não tem influencer, vai pro Site Oficial
    if (!influencer) {
      influencer = await getOrCreateSiteOfficial(base44);
    }

    // Calcula 3% de comissão
    const commissionPercent = 3.0;
    const commissionAmount = +(saleAmount * (commissionPercent / 100)).toFixed(2);

    // Cria registro de comissão
    const commissionRecord = await base44.asServiceRole.entities.CommissionRecord.create({
      sale_id: auctionId,
      sale_type: 'auction',
      user_id: influencer.id,
      user_name: influencer.full_name,
      role: 'influencer_app',
      percent: commissionPercent,
      amount: commissionAmount,
      status: 'confirmed',
      sale_amount: saleAmount,
      product_title: auction.title
    });

    // Atualiza saldo do Influencer
    const currentBalance = Number(influencer.valora_pay_balance || 0);
    const currentCommissionBalance = Number(influencer.commission_balance || 0);
    const totalGenerated = Number(influencer.total_commissions_generated || 0);

    await base44.asServiceRole.entities.AppUser.update(influencer.id, {
      valora_pay_balance: +(currentBalance + commissionAmount).toFixed(2),
      commission_balance: +(currentCommissionBalance + commissionAmount).toFixed(2),
      total_commissions_generated: +(totalGenerated + commissionAmount).toFixed(2)
    });

    console.log(`✅ Comissão 3% processada: R$ ${commissionAmount} para ${influencer.full_name}`);

    return Response.json({
      success: true,
      auction_id: auctionId,
      sale_amount: saleAmount,
      commission_percent: commissionPercent,
      commission_amount: commissionAmount,
      influencer_id: influencer.id,
      influencer_name: influencer.full_name,
      record_id: commissionRecord.id
    });

  } catch (error) {
    console.error('❌ Erro ao processar comissão do leilão:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});