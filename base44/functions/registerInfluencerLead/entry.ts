import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { influencer_code } = await req.json();

    if (!influencer_code) {
      return Response.json({ error: 'Código do influenciador não fornecido' }, { status: 400 });
    }

    // Verifica se já existe lead para este usuário (primeira indicação vale)
    const existingLeads = await base44.asServiceRole.entities.InfluencerLead.filter({ 
      lead_user_id: user.id 
    });

    if (existingLeads && existingLeads.length > 0) {
      return Response.json({ 
        success: true, 
        message: 'Usuário já registrado para outro influenciador',
        already_registered: true
      });
    }

    // Verifica se já existe lead pendente com este email
    const existingEmailLeads = await base44.asServiceRole.entities.InfluencerLead.filter({ 
      lead_email: user.email 
    });

    if (existingEmailLeads && existingEmailLeads.length > 0) {
      // Atualiza o lead existente com o ID do usuário
      const leadToUpdate = existingEmailLeads[0];
      await base44.asServiceRole.entities.InfluencerLead.update(leadToUpdate.id, {
        lead_user_id: user.id,
        lead_name: user.full_name,
        status: 'registered'
      });

      return Response.json({ 
        success: true, 
        message: 'Lead atualizado com sucesso',
        influencer_id: leadToUpdate.influencer_id
      });
    }

    // Extrai o ID do influenciador do código (formato: INF12345678)
    const influencerId = influencer_code.substring(3).toLowerCase();

    // Busca o influenciador
    const influencers = await base44.asServiceRole.entities.AppUser.filter({ 
      id: { $regex: `^${influencerId}`, $options: 'i' }
    });

    if (!influencers || influencers.length === 0) {
      return Response.json({ error: 'Influenciador não encontrado' }, { status: 404 });
    }

    const influencer = influencers[0];

    // Cria novo lead
    await base44.asServiceRole.entities.InfluencerLead.create({
      influencer_id: influencer.id,
      influencer_name: influencer.full_name,
      influencer_code: influencer_code,
      lead_email: user.email,
      lead_user_id: user.id,
      lead_name: user.full_name,
      status: 'registered',
      total_purchases: 0,
      total_spent: 0
    });

    return Response.json({ 
      success: true, 
      message: 'Lead registrado com sucesso',
      influencer_id: influencer.id
    });

  } catch (error) {
    console.error('Erro ao registrar lead do influenciador:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});