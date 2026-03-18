import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { search_name } = await req.json();

    const allUsers = await base44.asServiceRole.entities.AppUser.list('-created_date', 5000);
    
    // Busca por nome similar (case insensitive)
    const matchingUsers = allUsers.filter(u => 
      u.full_name?.toLowerCase().includes(search_name.toLowerCase())
    );

    // Agrupa por email
    const emailGroups = {};
    matchingUsers.forEach(u => {
      if (!emailGroups[u.email]) {
        emailGroups[u.email] = [];
      }
      emailGroups[u.email].push(u);
    });

    return Response.json({
      search_term: search_name,
      total_matches: matchingUsers.length,
      unique_emails: Object.keys(emailGroups).length,
      users: matchingUsers.map(u => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        phone: u.phone,
        cpf: u.cpf,
        role: u.role,
        created_date: u.created_date,
        referral_code: u.referral_code,
        referred_by_id: u.referred_by_id
      })),
      email_groups: emailGroups
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});