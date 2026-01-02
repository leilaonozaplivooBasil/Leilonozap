import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { auction_id, amount } = await req.json();

    // Busca o leilão para garantir que é Sai de Baixo
    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id });
    
    if (!auctions || auctions.length === 0) {
      return Response.json({ error: 'Leilão não encontrado' }, { status: 404 });
    }

    const auction = auctions[0];

    // Verifica se é leilão Sai de Baixo
    if (auction.partner_store !== 'sai_de_baixo') {
      return Response.json({ 
        success: true, 
        message: 'Leilão não é Sai de Baixo, nada rastreado' 
      });
    }

    // Busca se este usuário foi indicado por algum influenciador
    const userLeads = await base44.asServiceRole.entities.InfluencerLead.filter({ 
      lead_user_id: user.id 
    });

    if (!userLeads || userLeads.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'Usuário sem indicação de influenciador' 
      });
    }

    // Pega o primeiro lead (primeira indicação vale)
    const lead = userLeads[0];

    // Registra a compra
    await base44.asServiceRole.entities.InfluencerPurchase.create({
      influencer_id: lead.influencer_id,
      lead_user_id: user.id,
      auction_id: auction_id,
      product_title: auction.title,
      amount: amount,
      purchase_date: new Date().toISOString(),
      partner_store: 'sai_de_baixo'
    });

    // Atualiza estatísticas do lead
    const newTotalPurchases = (lead.total_purchases || 0) + 1;
    const newTotalSpent = (lead.total_spent || 0) + amount;
    
    const updateData = {
      total_purchases: newTotalPurchases,
      total_spent: newTotalSpent,
      status: 'active_buyer',
      last_purchase_date: new Date().toISOString()
    };

    if (!lead.first_purchase_date) {
      updateData.first_purchase_date = new Date().toISOString();
    }

    await base44.asServiceRole.entities.InfluencerLead.update(lead.id, updateData);

    return Response.json({ 
      success: true, 
      message: 'Compra rastreada com sucesso',
      influencer_id: lead.influencer_id
    });

  } catch (error) {
    console.error('Erro ao rastrear compra do influenciador:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});