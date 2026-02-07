import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    console.log('🔍 Iniciando análise de duplicatas...');

    const allUsers = await base44.asServiceRole.entities.AppUser.list('-created_date', 5000);
    
    console.log(`📊 Total de usuários: ${allUsers.length}`);

    // Estruturas para agrupar duplicatas
    const byEmail = {};
    const byPhone = {};
    const byCPF = {};
    const byFullName = {};

    // Agrupa usuários por critério
    allUsers.forEach(user => {
      const email = user.email?.toLowerCase().trim();
      const phone = user.phone?.replace(/\D/g, '');
      const cpf = user.cpf?.replace(/\D/g, '');
      const fullName = user.full_name?.toLowerCase().trim();

      if (email) {
        if (!byEmail[email]) byEmail[email] = [];
        byEmail[email].push(user);
      }

      if (phone && phone !== '00000000000') {
        if (!byPhone[phone]) byPhone[phone] = [];
        byPhone[phone].push(user);
      }

      if (cpf && cpf !== '00000000000') {
        if (!byCPF[cpf]) byCPF[cpf] = [];
        byCPF[cpf].push(user);
      }

      if (fullName) {
        if (!byFullName[fullName]) byFullName[fullName] = [];
        byFullName[fullName].push(user);
      }
    });

    // Identifica duplicatas
    const duplicatesByEmail = Object.entries(byEmail)
      .filter(([_, users]) => users.length > 1)
      .map(([email, users]) => ({
        type: 'email',
        value: email,
        count: users.length,
        users: users.map(u => ({
          id: u.id,
          full_name: u.full_name,
          created_date: u.created_date,
          role: u.role,
          has_purchases: (u.won_auctions || 0) > 0,
          has_commissions: (u.commission_balance || 0) > 0,
          is_licensee: u.role === 'licensee',
          is_admin: u.role === 'admin'
        })).sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      }));

    const duplicatesByPhone = Object.entries(byPhone)
      .filter(([_, users]) => users.length > 1)
      .map(([phone, users]) => ({
        type: 'phone',
        value: phone,
        count: users.length,
        users: users.map(u => ({
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          created_date: u.created_date,
          role: u.role
        })).sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      }));

    const duplicatesByCPF = Object.entries(byCPF)
      .filter(([_, users]) => users.length > 1)
      .map(([cpf, users]) => ({
        type: 'cpf',
        value: cpf,
        count: users.length,
        users: users.map(u => ({
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          created_date: u.created_date,
          role: u.role
        })).sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      }));

    const duplicatesByName = Object.entries(byFullName)
      .filter(([_, users]) => users.length > 1)
      .map(([name, users]) => ({
        type: 'full_name',
        value: name,
        count: users.length,
        users: users.map(u => ({
          id: u.id,
          email: u.email,
          phone: u.phone,
          created_date: u.created_date,
          role: u.role
        })).sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      }));

    // Recomendações de limpeza
    const recommendations = duplicatesByEmail.map(dup => {
      const [keep, ...toDelete] = dup.users;
      
      // Prioriza: admin > licensee > usuário com compras > mais recente
      const sorted = [...dup.users].sort((a, b) => {
        if (a.is_admin !== b.is_admin) return b.is_admin ? 1 : -1;
        if (a.is_licensee !== b.is_licensee) return b.is_licensee ? 1 : -1;
        if (a.has_purchases !== b.has_purchases) return b.has_purchases ? 1 : -1;
        if (a.has_commissions !== b.has_commissions) return b.has_commissions ? 1 : -1;
        return new Date(b.created_date) - new Date(a.created_date);
      });

      return {
        email: dup.value,
        keep: sorted[0],
        delete: sorted.slice(1),
        reason: sorted[0].is_admin ? 'Admin' : sorted[0].is_licensee ? 'Licenciado' : sorted[0].has_purchases ? 'Com compras' : 'Mais recente'
      };
    });

    const summary = {
      total_users: allUsers.length,
      duplicates_by_email: duplicatesByEmail.length,
      duplicates_by_phone: duplicatesByPhone.length,
      duplicates_by_cpf: duplicatesByCPF.length,
      duplicates_by_name: duplicatesByName.length,
      total_duplicate_records: duplicatesByEmail.reduce((sum, dup) => sum + (dup.count - 1), 0)
    };

    return Response.json({
      summary,
      duplicates: {
        by_email: duplicatesByEmail,
        by_phone: duplicatesByPhone,
        by_cpf: duplicatesByCPF,
        by_name: duplicatesByName
      },
      recommendations,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});