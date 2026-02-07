import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const allUsers = await base44.asServiceRole.entities.AppUser.list('-created_date', 5000);
    
    // Análise de CPF
    const withoutCPF = allUsers.filter(u => !u.cpf || u.cpf.trim() === '');
    const withPlaceholderCPF = allUsers.filter(u => u.cpf && u.cpf.replace(/\D/g, '') === '00000000000');
    const withValidCPF = allUsers.filter(u => u.cpf && u.cpf.replace(/\D/g, '') !== '00000000000' && u.cpf.trim() !== '');
    
    // Análise de telefone
    const withoutPhone = allUsers.filter(u => !u.phone || u.phone.trim() === '');
    const withPlaceholderPhone = allUsers.filter(u => u.phone && (u.phone.replace(/\D/g, '') === '00000000000' || u.phone.replace(/\D/g, '') === '21000000000'));
    const withValidPhone = allUsers.filter(u => u.phone && u.phone.trim() !== '' && u.phone.replace(/\D/g, '') !== '00000000000' && u.phone.replace(/\D/g, '') !== '21000000000');
    
    // Análise de endereço
    const withoutAddress = allUsers.filter(u => !u.address_street || u.address_street.trim() === '');
    const withCompleteAddress = allUsers.filter(u => 
      u.address_street && 
      u.address_number && 
      u.address_city && 
      u.address_state && 
      u.address_zip_code
    );
    
    // Por role
    const byRole = {
      admin: allUsers.filter(u => u.role === 'admin').length,
      licensee: allUsers.filter(u => u.role === 'licensee').length,
      user: allUsers.filter(u => u.role === 'user' || !u.role).length
    };

    return Response.json({
      total_users: allUsers.length,
      cpf_analysis: {
        without_cpf: withoutCPF.length,
        with_placeholder_cpf: withPlaceholderCPF.length,
        with_valid_cpf: withValidCPF.length,
        users_without_cpf: withoutCPF.map(u => ({
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          role: u.role,
          created_date: u.created_date
        }))
      },
      phone_analysis: {
        without_phone: withoutPhone.length,
        with_placeholder_phone: withPlaceholderPhone.length,
        with_valid_phone: withValidPhone.length
      },
      address_analysis: {
        without_address: withoutAddress.length,
        with_complete_address: withCompleteAddress.length
      },
      role_distribution: byRole,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});